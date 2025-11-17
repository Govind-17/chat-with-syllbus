# syntax=docker/dockerfile:1

FROM python:3.9-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

# System deps for pdf2image (poppler) and healthcheck tools
RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates curl wget poppler-utils \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
	pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Expose uploads and vector store directories as volumes
VOLUME ["/app/app/uploads", "/app/app/chroma_db"]

EXPOSE 8000

ENV HOST=0.0.0.0 \
	PORT=8000

# Healthcheck hits FastAPI health endpoint
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
	CMD curl -fsS http://localhost:8000/api/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host ${HOST} --port ${PORT} --workers 2"]


