from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
	question: str = Field(..., description="User's question about the MCA syllabus")


class ChatResponse(BaseModel):
	answer: str = Field(..., description="Generated answer for the question")
	sources: List[Dict[str, Any]] = Field(default_factory=list, description="Cited sources with metadata")
	confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1")
	session_id: str = Field(..., description="Associated chat session identifier")


class DocumentUploadResponse(BaseModel):
	filename: str = Field(..., description="Original filename of the uploaded PDF")
	status: str = Field(..., description="Processing status (uploading|processing|completed|failed)")
	chunks_processed: int = Field(..., ge=0, description="Number of chunks processed into the vector store")


class Session(BaseModel):
	id: str = Field(..., description="Session identifier")
	title: str = Field(..., min_length=1, description="Human-friendly session title")
	created_at: datetime = Field(..., description="Session creation timestamp")
	message_count: int = Field(..., ge=0, description="Number of messages in this session")

