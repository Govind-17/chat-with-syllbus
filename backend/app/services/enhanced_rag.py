import hashlib
import re
from typing import Dict, List, Tuple, Any
import time

from ..utils.logger import get_logger
from .pdf_processor import PDFProcessor
from .gemini_service import GeminiService

logger = get_logger("services.enhanced_rag")


def _hash_text(text: str) -> str:
	return hashlib.sha1(text.encode("utf-8")).hexdigest()  # nosec - non-crypto use


class EnhancedRAGService:
	"""
	RAG service that combines Chroma-backed PDF processing with Gemini generation,
	tuned for MCA syllabus queries: courses, credits, prerequisites, grading, careers.
	"""

	def __init__(
		self,
		pdf: PDFProcessor,
		gen: GeminiService,
		max_context_chars: int = 6000,
		per_variant_k: int = 4,
	) -> None:
		self.pdf = pdf
		self.gen = gen
		self.max_context_chars = max_context_chars
		self.per_variant_k = per_variant_k

		self.semester_pattern = re.compile(r"(sem(?:ester)?\s*[1-8])", re.IGNORECASE)
		self.focus_keywords = {
			"credits": ["credit", "ects"],
			"prerequisite": ["prerequisite", "prereq", "eligibility"],
			"grading": ["grade", "grading", "assessment", "exam"],
			"career": ["career", "job", "role"],
			"project": ["project", "capstone"],
		}

	def generate_mca_context_prompt(self) -> str:
		return (
			"MCA domain context. Prioritize: course structure (semesters, subjects, modules, credits), "
			"prerequisites (skills, prior courses), grading (internal assessment, exams, weightage), "
			"and career guidance (roles aligned to syllabus topics). Extract concise, factual statements. "
			"Prefer the most relevant and recent syllabus details. Include brief bullet lists for enumerations."
		)

	def _expand_query(self, question: str) -> List[str]:
		"""
		Simple query expansion with MCA-specific synonyms to improve recall.
		"""
		q = question.strip()
		variants = {q}
		lower = q.lower()
		# Heuristic expansions
		if "credit" in lower:
			variants.add(q + " credit distribution per semester")
		if "prereq" in lower or "prerequisite" in lower or "eligibility" in lower:
			variants.add(q + " prerequisites and assumed knowledge")
		if "grade" in lower or "assessment" in lower or "exam" in lower:
			variants.add(q + " grading system internal assessment and end-semester weightage")
		if "syllabus" in lower or "course" in lower or "semester" in lower:
			variants.add(q + " MCA course structure subjects and modules")
		if "career" in lower or "job" in lower or "role" in lower:
			variants.add(q + " career pathways aligned to syllabus topics")
		return list(variants)

	def _analyze_question(self, question: str) -> Dict[str, Any]:
		lower = question.lower()
		semesters = [match.strip().replace(" ", "").replace("semester", "sem") for match in self.semester_pattern.findall(lower)]
		focus = "general"
		for label, keywords in self.focus_keywords.items():
			if any(word in lower for word in keywords):
				focus = label
				break
		return {"semesters": semesters, "focus": focus}

	def _retrieve_with_sources(self, question: str) -> List[Tuple[float, str, Dict[str, Any]]]:
		"""
		Retrieve documents with similarity scores and metadata.
		Returns list of tuples: (score, content, metadata)
		"""
		results: List[Tuple[float, str, Dict[str, Any]]] = []
		try:
			# Prefer similarity_search_with_score if available
			for variant in self._expand_query(question):
				try:
					with_scores = self.pdf.vectorstore.similarity_search_with_score(variant, k=self.per_variant_k)  # type: ignore[attr-defined]
					for doc, score in with_scores:
						results.append((float(score), doc.page_content, doc.metadata))
				except Exception:
					# Fallback to plain similarity search
					docs = self.pdf.vectorstore.similarity_search(variant, k=self.per_variant_k)
					for doc in docs:
						results.append((1.0, doc.page_content, doc.metadata))
		except Exception as retr_exc:
			logger.error(f"Retrieval failed: {retr_exc}", exc_info=True)
		return results

	def _build_context(self, retrieved: List[Tuple[float, str, Dict[str, Any]]], analysis: Dict[str, Any]) -> Tuple[str, List[Dict[str, Any]]]:
		"""
		Builds a bounded-length context string with numbered citations and returns source metadata.
		"""
		if not retrieved:
			return "", []

		# Deduplicate by content hash, prefer better score (lower distance if present)
		by_hash: Dict[str, Tuple[float, str, Dict[str, Any]]] = {}
		for score, content, meta in retrieved:
			h = _hash_text(content)
			if h not in by_hash or score < by_hash[h][0]:
				by_hash[h] = (score, content, meta)

		# Sort by score ascending (assuming distance); if they are uniform, order preserved
		sorted_items = sorted(by_hash.values(), key=lambda x: x[0])

		context_parts: List[str] = []
		sources: List[Dict[str, Any]] = []
		total_chars = 0
		guide = self.generate_mca_context_prompt()
		context_parts.append(f"Guidance: {guide}\nFocus: {analysis.get('focus')} | Semesters: {', '.join(analysis.get('semesters') or ['all'])}\n")
		total_chars += len(context_parts[-1])

		def context_mentions_semester(text: str) -> bool:
			targets = analysis.get("semesters") or []
			if not targets:
				return True
			text_lower = text.lower()
			return any(sem.replace("sem", "").strip() in text_lower for sem in targets)

		def try_append(idx: int, score: float, content: str, meta: Dict[str, Any]) -> bool:
			nonlocal total_chars
			name = meta.get("source") or meta.get("file_path") or "document"
			page = meta.get("page") or meta.get("page_number") or meta.get("page_index")
			header = f"[{idx}] Source: {name}"
			if page is not None:
				header += f", page {page}"
			header += f" (score: {score:.4f})"
			segment = f"{header}\n{content}\n"
			if total_chars + len(segment) > self.max_context_chars:
				return False
			context_parts.append(segment)
			total_chars += len(segment)
			sources.append({"index": idx, "name": name, "page": page, "score": float(score)})
			return True

		applied_filter = bool(analysis.get("semesters"))
		for idx, (score, content, meta) in enumerate(sorted_items, start=1):
			if applied_filter and not context_mentions_semester(content):
				continue
			if not try_append(idx, score, content, meta):
				break

		if applied_filter and not sources:
			for idx, (score, content, meta) in enumerate(sorted_items, start=1):
				if not try_append(idx, score, content, meta):
					break

		if sources:
			doc_counts: Dict[str, int] = {}
			for src in sources:
				doc_counts[src["name"]] = doc_counts.get(src["name"], 0) + 1
			summary_lines = [f"- {name}: {count} context blocks" for name, count in doc_counts.items()]
			summary_text = "Document coverage:\n" + "\n".join(summary_lines) + "\n"
			if total_chars + len(summary_text) <= self.max_context_chars:
				context_parts.append(summary_text)

		return ("\n".join(context_parts).strip(), sources)

	def _generate_follow_up(self, question: str, analysis: Dict[str, Any], sources: List[Dict[str, Any]]) -> str:
		if analysis.get("focus") == "credits":
			return "Would you like a semester-by-semester credit comparison?"
		if analysis.get("focus") == "prerequisite":
			return "Should I list bridge courses to meet the prerequisites?"
		if analysis.get("focus") == "career":
			return "Do you want recommendations for internships aligned with these courses?"
		if sources:
			return "Need more detail from any of the cited documents?"
		return "Would you like to explore related MCA modules?"

	def _confidence_explanation(self, confidence: float, context_count: int, source_count: int) -> str:
		if confidence > 0.75:
			return f"High confidence based on {context_count} context blocks across {source_count} sources."
		if confidence > 0.5:
			return f"Moderate confidence: {context_count} context blocks from {source_count} sources."
		return f"Low confidence because only {context_count} context blocks were relevant."

	def ask_question(self, question: str) -> Dict[str, Any]:
		"""
		Full RAG pipeline:
		- Expand query
		- Retrieve similar chunks with sources
		- Build bounded context
		- Generate answer with Gemini
		- Format response; handle insufficient context
		"""
		question = (question or "").strip()
		if not question:
			return {"answer": "Please provide a question related to the MCA syllabus.", "sources": [], "confidence": 0.0}

		t0 = time.time()
		analysis = self._analyze_question(question)
		retrieved = self._retrieve_with_sources(question)
		context_text, sources = self._build_context(retrieved, analysis)

		if not context_text or not sources:
		return {
			"answer": "I don't know based on the available syllabus context. Please provide more details or upload relevant documents.",
			"sources": [],
			"confidence": 0.2,
			"confidence_explanation": "No relevant syllabus passages were retrieved.",
			"follow_up": "Upload a syllabus PDF for the semester you're interested in.",
		}

		# Provide context segments to the generator; it will construct a tailored prompt
		t1 = time.time()
		instruction_block = (
			"Formatting instructions:\n"
			"- Start with a concise answer paragraph.\n"
			"- Use bullet lists for modules/credits/prereqs.\n"
			"- Mention semesters explicitly if available.\n"
			"- Provide a short concluding recommendation."
		)
		prompt_context = context_text + "\n\n" + instruction_block

		gen_result = self.gen.generate_answer(question, prompt_context)
		answer = gen_result.get("answer", "").strip()
		confidence = float(gen_result.get("confidence", 0.5))
		t2 = time.time()

		logger.info(
			f"RAG timings: retrieve+context={(t1 - t0)*1000:.1f}ms, generate={(t2 - t1)*1000:.1f}ms, total={(t2 - t0)*1000:.1f}ms"
		)

		# Basic post-formatting: ensure bullet points render for enumerations
		if "- " not in answer and ";" in answer:
			parts = [p.strip() for p in answer.split(";") if p.strip()]
			if len(parts) >= 3:
				answer = parts[0] + "\n" + "\n".join(f"- {p}" for p in parts[1:])

		follow_up = self._generate_follow_up(question, analysis, sources)
		unique_sources = len({src["name"] for src in sources})
		confidence_expl = self._confidence_explanation(confidence, len(sources), unique_sources)

		return {
			"answer": answer,
			"sources": sources,
			"confidence": confidence,
			"confidence_explanation": confidence_expl,
			"follow_up": follow_up,
		}


