from .rag import retrieve_relevant_chunks  # noqa: F401 - ensure import path is valid
from ..utils.logger import get_logger
from ..core.config import load_settings

logger = get_logger("services.startup")


async def initialize_services() -> None:
	"""
	Initialize long-lived services like vector stores, LLM clients, caches, etc.
	Currently a placeholder; extend as the RAG stack is implemented.
	"""
	logger.info("Initializing services (vector store, LLM clients, caches)...")
	# Validate required environment
	settings = load_settings()
	if settings.app_env == "production" and not settings.resolved_api_key:
		# In production, require an API key for Gemini
		raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) must be set in production.")
	if not settings.cors_origins:
		logger.warning("CORS_ORIGINS not set; defaulting to http://localhost:5173")
	if settings.upload_file_size_limit_mb <= 0:
		logger.warning("UPLOAD_FILE_SIZE_LIMIT must be positive; defaulting to 50MB")
	# Add actual initialization logic here as needed.
	logger.info("Services initialized.")


