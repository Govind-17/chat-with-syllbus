import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..utils.logger import get_logger
from ..services.pdf_processor import PDFProcessor
from ..services.gemini_service import GeminiService
from ..services.enhanced_rag import EnhancedRAGService

logger = get_logger("routers.chat")

router = APIRouter(prefix="/chat", tags=["chat"])

# Singletons for services
_pdf = PDFProcessor()
_gemini = GeminiService()
_rag = EnhancedRAGService(pdf=_pdf, gen=_gemini)

# In-memory session store: session_id -> list of message dicts
SESSIONS: Dict[str, List[Dict[str, Any]]] = {}
SESSION_TTL_SECONDS = 60 * 60 * 24  # 24 hours default


def _prune_sessions() -> None:
	now = time.time()
	to_delete: List[str] = []
	for sid, msgs in SESSIONS.items():
		last_ts = max((m.get("ts", 0.0) for m in msgs), default=0.0)
		if now - last_ts > SESSION_TTL_SECONDS:
			to_delete.append(sid)
	for sid in to_delete:
		try:
			del SESSIONS[sid]
		except Exception:
			pass


class AskRequest(BaseModel):
	question: str = Field(..., min_length=1, description="User's question about the MCA syllabus")
	session_id: Optional[str] = Field(default=None, description="Chat session identifier")


class SourceItem(BaseModel):
	index: int
	name: str
	page: Optional[int] = None
	score: Optional[float] = None


class AskResponse(BaseModel):
	answer: str
	sources: List[SourceItem] = Field(default_factory=list)
	confidence: float = Field(ge=0.0, le=1.0)
	confidence_explanation: str = Field(..., description="Explains why the score was assigned.")
	follow_up_question: Optional[str] = None
	session_id: str


class SessionCreateResponse(BaseModel):
	session_id: str


class SessionInfo(BaseModel):
	session_id: str
	message_count: int
	updated_at: float


@router.post("/ask", response_model=AskResponse)
def ask(request: AskRequest) -> AskResponse:
	_prune_sessions()
	session_id = request.session_id or str(uuid.uuid4())
	if session_id not in SESSIONS:
		SESSIONS[session_id] = []

	try:
		result = _rag.ask_question(request.question)
	except Exception as exc:
		logger.error(f"ask() failed: {exc}", exc_info=True)
		raise HTTPException(status_code=500, detail="Failed to generate answer")

	answer = str(result.get("answer", ""))
	confidence = float(result.get("confidence", 0.0))
	confidence_expl = result.get("confidence_explanation", "")
	follow_up = result.get("follow_up")
	raw_sources = result.get("sources", []) or []
	sources: List[SourceItem] = [SourceItem(**s) for s in raw_sources if isinstance(s, dict)]

	# Append to history
	SESSIONS[session_id].append(
		{
			"ts": time.time(),
			"question": request.question,
			"answer": answer,
			"sources": [s.dict() for s in sources],
			"confidence": confidence,
			"confidence_explanation": confidence_expl,
			"follow_up_question": follow_up,
		}
	)

	return AskResponse(
		answer=answer,
		confidence=confidence,
		confidence_explanation=confidence_expl,
		follow_up_question=follow_up,
		sources=sources,
		session_id=session_id,
	)


@router.get("/history")
def history(session_id: str = Query(..., description="Chat session identifier")):
	_prune_sessions()
	history_items = SESSIONS.get(session_id)
	if history_items is None:
		raise HTTPException(status_code=404, detail="Session not found")
	return {"session_id": session_id, "messages": history_items}


@router.post("/sessions", response_model=SessionCreateResponse)
def create_session() -> SessionCreateResponse:
	_prune_sessions()
	session_id = str(uuid.uuid4())
	SESSIONS[session_id] = []
	return SessionCreateResponse(session_id=session_id)


@router.get("/sessions", response_model=List[SessionInfo])
def list_sessions() -> List[SessionInfo]:
	_prune_sessions()
	now = time.time()
	response: List[SessionInfo] = []
	for sid, msgs in SESSIONS.items():
		last_ts = max((m.get("ts", 0.0) for m in msgs), default=now)
		response.append(SessionInfo(session_id=sid, message_count=len(msgs), updated_at=last_ts))
	return response


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
	_prune_sessions()
	if session_id not in SESSIONS:
		raise HTTPException(status_code=404, detail="Session not found")
	try:
		del SESSIONS[session_id]
		return {"session_id": session_id, "status": "deleted"}
	except Exception as exc:
		logger.error(f"Failed to delete session {session_id}: {exc}", exc_info=True)
		raise HTTPException(status_code=500, detail="Failed to delete session")


