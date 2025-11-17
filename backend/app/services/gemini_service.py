import os
import time
from collections import deque
from typing import Deque, Dict, List, Optional, Tuple, Union

from ..utils.logger import get_logger

logger = get_logger("services.gemini_service")

try:
	import google.generativeai as genai
except Exception as import_exc:
	genai = None  # type: ignore[assignment]
	logger.error("google-generativeai not available. Install and pin in requirements.", exc_info=True)


class RateLimiter:
	"""
	Simple in-memory rate limiter: max calls per rolling minute.
	"""

	def __init__(self, max_per_minute: int = 60) -> None:
		self.max_per_minute = max_per_minute
		self.call_timestamps: Deque[float] = deque()

	def acquire(self) -> None:
		now = time.time()
		# drop entries older than 60s
		while self.call_timestamps and now - self.call_timestamps[0] > 60.0:
			self.call_timestamps.popleft()
		if len(self.call_timestamps) >= self.max_per_minute:
			sleep_for = 60.0 - (now - self.call_timestamps[0]) + 0.01
			if sleep_for > 0:
				logger.info(f"Rate limit reached; sleeping for {sleep_for:.2f}s")
				time.sleep(sleep_for)
		self.call_timestamps.append(time.time())


class GeminiService:
	def __init__(
		self,
		api_key: Optional[str] = None,
		model_name: Optional[str] = None,
		max_per_minute: int = 60,
	) -> None:
		if genai is None:
			raise RuntimeError("google-generativeai library is not available")

		self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GENAI_API_KEY")
		if not self.api_key:
			raise RuntimeError("GOOGLE_API_KEY (or GENAI_API_KEY) is required for Gemini")

		self.model_name = model_name or os.getenv("GEMINI_MODEL_NAME") or "gemini-1.5-flash"

		genai.configure(api_key=self.api_key)
		self.model = genai.GenerativeModel(self.model_name)
		self.rate_limiter = RateLimiter(max_per_minute=max_per_minute)

	def _build_prompt(self, question: str, context_text: str) -> str:
		guidelines = (
			"You are an academic assistant for the MCA (Master of Computer Applications) syllabus.\n"
			"Answer concisely and accurately using ONLY the provided context.\n"
			"If the context is insufficient, say you are not sure and suggest where to look.\n"
			"\n"
			"Specialized guidance you support:\n"
			"- Course structure queries: semesters, subjects, modules, credit distribution.\n"
			"- Prerequisite questions: assumed knowledge, required prior courses, skills.\n"
			"- Grading system explanations: internal assessment, end-semester exams, weightage.\n"
			"- Career guidance: roles and pathways aligned with syllabus topics.\n"
			"\n"
			"Formatting:\n"
			"- Provide a direct answer first.\n"
			"- If relevant, add a short bullet list of key points.\n"
			"- End with a one-line confidence score: Confidence: <low|medium|high>.\n"
		)
		prompt = (
			f"{guidelines}\n"
			f"Context:\n"
			f"{context_text}\n"
			f"\n"
			f"Question: {question}\n"
			f"Answer:"
		)
		return prompt

	def _estimate_confidence(self, answer_text: str, context_text: str) -> Tuple[str, float]:
		"""
		Heuristic confidence estimation in absence of explicit model confidence.
		"""
		if not answer_text.strip():
			return "low", 0.2
		len_score = min(len(answer_text) / 600.0, 1.0)  # cap after ~600 chars
		context_factor = 0.0 if not context_text.strip() else 0.5
		score = 0.3 + 0.5 * len_score + context_factor
		score = max(0.0, min(score, 1.0))
		label = "high" if score > 0.75 else "medium" if score > 0.5 else "low"
		return label, score

	def generate_answer(self, question: str, context: Union[str, List[str]]) -> Dict[str, Union[str, float]]:
		"""
		Generate an answer with Gemini using the provided context.
		Returns a dict with 'answer' and 'confidence' (0..1).
		Includes rate limiting and retry with exponential backoff.
		"""
		context_text = context if isinstance(context, str) else "\n\n".join(context or [])
		prompt = self._build_prompt(question, context_text)

		# Rate limit
		self.rate_limiter.acquire()

		max_attempts = 3
		delay = 1.0
		last_error: Optional[Exception] = None

		for attempt in range(1, max_attempts + 1):
			try:
				response = self.model.generate_content(prompt)
				text = getattr(response, "text", "") or ""

				conf_label, conf_score = self._estimate_confidence(text, context_text)

				# Ensure answer ends with explicit confidence line as per formatting
				formatted = text.strip()
				if f"Confidence:" not in formatted:
					formatted += f"\n\nConfidence: {conf_label}"

				return {"answer": formatted, "confidence": conf_score}
			except Exception as exc:
				last_error = exc
				is_last = attempt == max_attempts
				# Backoff for rate limits and transient errors
				msg = str(exc).lower()
				if "429" in msg or "rate" in msg or "temporarily" in msg or "deadline" in msg or "timeout" in msg:
					logger.warning(f"Gemini call failed (attempt {attempt}/{max_attempts}), retrying in {delay:.1f}s: {exc}")
					time.sleep(delay)
					delay *= 2
					continue
				logger.error(f"Gemini call failed (non-retryable): {exc}", exc_info=True)
				break

		logger.error("Gemini call failed after retries.", exc_info=True)
		fallback = "I'm not fully confident based on the provided context. Please provide more details or relevant syllabus excerpts."
		return {"answer": f"{fallback}\n\nConfidence: low", "confidence": 0.2}


