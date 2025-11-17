from typing import Any, Dict, List
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
	question: str = Field(..., min_length=1, description="User's question about the MCA syllabus")


class ChatResponse(BaseModel):
	answer: str = Field(..., description="Generated answer for the question")
	sources: List[Dict[str, Any]] = Field(default_factory=list, description="Cited sources with metadata")
	confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1")
	confidence_explanation: str = Field(..., description="Human-readable explanation of confidence score")
	follow_up_question: Optional[str] = Field(default=None, description="Suggested follow-up question for the user")
	session_id: str = Field(..., description="Associated chat session identifier")


