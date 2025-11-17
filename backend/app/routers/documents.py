import hashlib
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiofiles
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from ..utils.logger import get_logger
from ..services.pdf_processor import PDFProcessor

logger = get_logger("routers.documents")

router = APIRouter(prefix="/documents", tags=["documents"])

# Storage and processor
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

pdf_processor = PDFProcessor()

# In-memory status tracking
# doc_id -> { filename, path, size, uploaded_bytes, status, detail, chunks }
STATUSES: Dict[str, Dict[str, Any]] = {}


def _make_doc_id(path: Path) -> str:
	return hashlib.sha1(str(path).encode("utf-8")).hexdigest()  # nosec - non-crypto id


def _validate_pdf_filename(filename: str) -> None:
	if not filename.lower().endswith(".pdf"):
		raise HTTPException(status_code=400, detail="Only PDF files are allowed")


@router.post("/upload")
async def upload_pdf(
	request: Request,
	file: UploadFile = File(...),
	background: BackgroundTasks = None,  # type: ignore[assignment]
):
	_validate_pdf_filename(file.filename or "")

	content_length_header = request.headers.get("content-length")
	total_size: Optional[int] = int(content_length_header) if content_length_header and content_length_header.isdigit() else None

	# Stream to disk
	target_name = f"{int(time.time())}_{file.filename}"
	target_path = UPLOADS_DIR / target_name
	doc_id = _make_doc_id(target_path)

	STATUSES[doc_id] = {
		"filename": file.filename,
		"path": str(target_path),
		"size": total_size,
		"uploaded_bytes": 0,
		"status": "uploading",
		"detail": None,
		"chunks": 0,
	}

	max_bytes = pdf_processor.max_file_bytes  # align with service validation
	written = 0
	try:
		async with aiofiles.open(target_path, "wb") as out:
			while True:
				chunk = await file.read(1024 * 1024)  # 1MB
				if not chunk:
					break
				written += len(chunk)
				if written > max_bytes:
					raise HTTPException(status_code=413, detail=f"File too large. Limit is {max_bytes} bytes")
				await out.write(chunk)
				STATUSES[doc_id]["uploaded_bytes"] = written
		STATUSES[doc_id]["status"] = "uploaded"
	except HTTPException as hx:
		STATUSES[doc_id]["status"] = "failed"
		STATUSES[doc_id]["detail"] = hx.detail
		# Best-effort cleanup
		if target_path.exists():
			try:
				target_path.unlink()
			except Exception:
				pass
		raise
	except Exception as exc:
		STATUSES[doc_id]["status"] = "failed"
		STATUSES[doc_id]["detail"] = str(exc)
		if target_path.exists():
			try:
				target_path.unlink()
			except Exception:
				pass
		logger.error(f"Upload failed for {file.filename}: {exc}", exc_info=True)
		raise HTTPException(status_code=500, detail="Upload failed")

	# Process in background to avoid blocking
	def _process(path_str: str, doc_id_local: str) -> None:
		try:
			STATUSES[doc_id_local]["status"] = "processing"
			count = pdf_processor.process_pdf(path_str)
			STATUSES[doc_id_local]["chunks"] = count
			STATUSES[doc_id_local]["status"] = "completed"
		except Exception as proc_exc:
			STATUSES[doc_id_local]["status"] = "failed"
			STATUSES[doc_id_local]["detail"] = str(proc_exc)
			logger.error(f"Processing failed for {path_str}: {proc_exc}", exc_info=True)

	if background is not None:
		background.add_task(_process, str(target_path), doc_id)
	else:
		# Fallback: run inline (not ideal but keeps function usable)
		_process(str(target_path), doc_id)

	return JSONResponse({"doc_id": doc_id, "filename": file.filename, "status": STATUSES[doc_id]["status"]})


@router.get("/list")
def list_documents():
	items = []
	for doc_id, info in STATUSES.items():
		items.append(
			{
				"doc_id": doc_id,
				"filename": info.get("filename"),
				"size": info.get("size"),
				"uploaded_bytes": info.get("uploaded_bytes"),
				"status": info.get("status"),
				"chunks": info.get("chunks"),
			}
		)
	return {"documents": items}


@router.get("/status")
def get_status(doc_id: Optional[str] = None):
	if doc_id:
		info = STATUSES.get(doc_id)
		if not info:
			raise HTTPException(status_code=404, detail="Document not found")
		return {"doc_id": doc_id, "status": info.get("status"), "uploaded_bytes": info.get("uploaded_bytes"), "size": info.get("size"), "detail": info.get("detail"), "chunks": info.get("chunks")}
	return {"statuses": STATUSES}


@router.delete("/{doc_id}")
def delete_document(doc_id: str):
	info = STATUSES.get(doc_id)
	if not info:
		raise HTTPException(status_code=404, detail="Document not found")

	path = Path(info.get("path", ""))
	try:
		# Attempt to delete vectors associated with this source if supported
		try:
			pdf_processor.vectorstore.delete(where={"source": str(path)})  # type: ignore[arg-type]
		except Exception:
			# If not supported, continue with file deletion only
			pass

		if path.exists():
			path.unlink()
		info["status"] = "deleted"
		return {"doc_id": doc_id, "status": "deleted"}
	except Exception as exc:
		logger.error(f"Failed to delete document {doc_id}: {exc}", exc_info=True)
		raise HTTPException(status_code=500, detail="Failed to delete document")


