import os
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from dotenv import load_dotenv

from .routers import health
from .routers import chat
from .routers import documents
from .routers import analysis
from .utils.logger import get_logger
from .services.startup import initialize_services
from .core.config import load_settings

load_dotenv()
logger = get_logger("app.main")
settings = load_settings()

def create_app() -> FastAPI:
	app = FastAPI(
		title="Chat with MCA Syllabus",
		description="RAG application to chat with the MCA syllabus using retrieval and LLM generation.",
		version="0.1.0",
		contact={"name": "Chat with MCA Syllabus"},
		license_info={"name": "MIT"},
	)

	# CORS for React frontend
	allow_origins: List[str] = settings.cors_origins
	app.add_middleware(
		CORSMiddleware,
		allow_origins=allow_origins,
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
	)

	# Routers
	app.include_router(health.router, prefix="/api")
	app.include_router(chat.router, prefix="/api")
	app.include_router(documents.router, prefix="/api")
	app.include_router(analysis.router, prefix="/api")

	# Static files for uploaded documents
	base_dir = Path(__file__).resolve().parent.parent
	uploads_dir = base_dir / "uploads"
	app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

	@app.get("/")
	def root():
		return {"status": "ok", "service": "Chat with MCA Syllabus"}

	# Global exception handling
	@app.exception_handler(HTTPException)
	def http_exception_handler(request: Request, exc: HTTPException):
		logger.warning(f"HTTPException {exc.status_code} at {request.url}: {exc.detail}")
		return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

	@app.exception_handler(StarletteHTTPException)
	def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
		logger.warning(f"StarletteHTTPException {exc.status_code} at {request.url}: {exc.detail}")
		return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

	@app.exception_handler(RequestValidationError)
	def validation_exception_handler(request: Request, exc: RequestValidationError):
		logger.info(f"Validation error at {request.url}: {exc.errors()}")
		return JSONResponse(status_code=422, content={"detail": "Invalid request", "errors": exc.errors()})

	@app.exception_handler(Exception)
	def unhandled_exception_handler(request: Request, exc: Exception):
		logger.error(f"Unhandled exception at {request.url}: {exc}", exc_info=True)
		return JSONResponse(status_code=500, content={"detail": "Internal server error"})

	# Startup event for initializing services
	@app.on_event("startup")
	async def on_startup():
		try:
			uploads_dir.mkdir(parents=True, exist_ok=True)
			await initialize_services()
			logger.info("Application startup completed.")
		except Exception as startup_exc:
			logger.error("Startup initialization failed.", exc_info=True)
			raise startup_exc

	return app


app = create_app()


