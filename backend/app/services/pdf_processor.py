import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..utils.logger import get_logger
import time

logger = get_logger("services.pdf_processor")


# LangChain + Chroma imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document


class PDFProcessor:
	"""
	Process PDFs into chunks, embed them, and store in ChromaDB for retrieval.
	"""

	def __init__(
		self,
		persist_directory: Optional[str] = None,
		model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
		chunk_size: int = 1000,
		chunk_overlap: int = 200,
		max_file_mb: int = 50,
	) -> None:
		# Allow override via environment variable UPLOAD_FILE_SIZE_LIMIT (MB)
		try:
			env_limit = int(os.getenv("UPLOAD_FILE_SIZE_LIMIT", "").strip()) if os.getenv("UPLOAD_FILE_SIZE_LIMIT") else None
			if env_limit and env_limit > 0:
				max_file_mb = env_limit
		except Exception:
			pass
		self.persist_directory = persist_directory or str(Path(__file__).resolve().parent.parent / "chroma_db")
		Path(self.persist_directory).mkdir(parents=True, exist_ok=True)

		self.embeddings = HuggingFaceEmbeddings(model_name=model_name)
		self.text_splitter = RecursiveCharacterTextSplitter(
			chunk_size=chunk_size,
			chunk_overlap=chunk_overlap,
		)
		self.max_file_bytes = max_file_mb * 1024 * 1024

		# Initialize or load existing Chroma collection
		self.vectorstore: Chroma = Chroma(
			persist_directory=self.persist_directory,
			embedding_function=self.embeddings,
		)
		logger.info(f"Chroma vector store ready at: {self.persist_directory}")

	def _validate_pdf_file(self, file_path: str) -> None:
		path = Path(file_path)
		if not path.exists() or not path.is_file():
			raise FileNotFoundError(f"File not found: {file_path}")
		# Basic extension check
		if path.suffix.lower() != ".pdf":
			raise ValueError("Only .pdf files are supported")
		# Size check
		size = path.stat().st_size
		if size > self.max_file_bytes:
			raise ValueError(f"File too large: {size} bytes (limit {self.max_file_bytes} bytes)")

	def process_pdf(self, file_path: str) -> int:
		"""
		Load a PDF, chunk it, embed and store in Chroma. Returns number of chunks added.
		"""
		start = time.time()
		self._validate_pdf_file(file_path)
		logger.info(f"Processing PDF: {file_path}")

		try:
			loader = PyPDFLoader(file_path)
			pages: List[Document] = loader.load()
		except Exception as load_exc:
			# Corrupt PDF or unreadable content
			logger.error(f"Failed to load PDF '{file_path}': {load_exc}", exc_info=True)
			raise ValueError(f"Unable to load PDF: {load_exc}") from load_exc

		try:
			chunks: List[Document] = self.text_splitter.split_documents(pages)
			if not chunks:
				logger.warning(f"No content extracted from PDF: {file_path}")
				return 0

			self.vectorstore.add_documents(chunks)
			self.vectorstore.persist()

			elapsed = (time.time() - start) * 1000.0
			logger.info(f"Added {len(chunks)} chunks from '{file_path}' to Chroma in {elapsed:.1f}ms.")
			return len(chunks)
		except Exception as proc_exc:
			logger.error(f"Failed to process PDF '{file_path}': {proc_exc}", exc_info=True)
			raise

	def search_similar(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
		"""
		Search for similar chunks by query. Returns a list of {content, metadata}.
		"""
		start = time.time()
		if not query or not query.strip():
			return []
		try:
			results: List[Document] = self.vectorstore.similarity_search(query, k=k)
			elapsed = (time.time() - start) * 1000.0
			logger.info(f"Similarity search k={k} in {elapsed:.1f}ms for query='{query[:48]}...'")
			return [{"content": d.page_content, "metadata": d.metadata} for d in results]
		except Exception as search_exc:
			logger.error(f"Similarity search failed for query '{query}': {search_exc}", exc_info=True)
			return []

	def get_document_count(self) -> int:
		"""
		Return number of vectors/documents stored in the collection.
		Note: uses Chroma internal collection count.
		"""
		try:
			# chromadb client count via internal collection
			return int(self.vectorstore._collection.count())  # type: ignore[attr-defined]
		except Exception as count_exc:
			logger.warning(f"Count retrieval failed: {count_exc}")
			return 0


