from datetime import datetime
from pydantic import BaseModel, Field


class Session(BaseModel):
	id: str = Field(..., description="Session identifier")
	title: str = Field(..., min_length=1, description="Human-friendly session title")
	created_at: datetime = Field(..., description="Session creation timestamp")
	message_count: int = Field(..., ge=0, description="Number of messages in this session")


