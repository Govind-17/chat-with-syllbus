import os
from typing import List, Tuple

from dotenv import load_dotenv

load_dotenv()


def retrieve_relevant_chunks(query: str) -> List[Tuple[str, str]]:
	"""
	Stub retrieval: returns (content, source) tuples.
	Replace with vector DB retrieval (FAISS/Chroma/etc.).
	"""
	# TODO: integrate actual retrieval
	return [(f"Relevant syllabus content for: {query}", "sample_source.md")]


def generate_answer(query: str, contexts: List[str]) -> str:
	"""
	Stub generation. Replace with LLM call (OpenAI/Azure/Ollama/etc.).
	"""
	model_name = os.getenv("LLM_MODEL_NAME", "stub-llm")
	context_block = "\n\n".join(contexts) if contexts else "No context available."
	return f"[{model_name}] Answer to '{query}' using context:\n{context_block}"


