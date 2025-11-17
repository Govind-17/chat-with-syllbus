from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
	filename: str = Field(..., description="Original filename of the uploaded PDF")
	status: str = Field(..., description="Processing status: uploading|uploaded|processing|completed|failed")
	chunks_processed: int = Field(..., ge=0, description="Number of chunks processed into the vector store")


