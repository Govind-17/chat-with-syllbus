## Chat with MCA Syllabus — RAG Application

This project is a minimal Retrieval-Augmented Generation (RAG) application that lets users chat about the MCA syllabus. It includes:

- Backend: FastAPI (Python)
- Frontend: React + TypeScript (Vite)

### Project Structure

```
backend/
  app/
    main.py
    models/
      chat.py
    routers/
      health.py
      chat.py
    services/
      rag.py
    utils/
      logger.py
  requirements.txt
  .env.example (see note below)

frontend/
  package.json
  tsconfig.json
  vite.config.ts
  public/
    index.html
  src/
    main.tsx
    App.tsx
    components/
      ChatBox.tsx
    services/
      api.ts
```

Note: If your environment blocks creating `.env` dotfiles in the template, create `backend/.env` manually using the content shown below in the configuration section.

---

## Backend (FastAPI)

### Prerequisites
- Python 3.10+

### Setup
1. Create and activate a virtual environment (recommended).
   - PowerShell:
     ```
     cd backend
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Environment variables:
   - Create a file `backend/.env` with (replace the API key):
     ```
     APP_ENV=development
     GEMINI_API_KEY=your_gemini_api_key_here
     GEMINI_MODEL_NAME=gemini-1.5-flash
     DATABASE_URL=sqlite:///./app.db
     CORS_ORIGINS=http://localhost:5173
     UPLOAD_FILE_SIZE_LIMIT=50
     ```
4. Run the server:
   ```
   uvicorn app.main:app --reload --port 8000
   ```

### Auto Docs
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Frontend (React + TypeScript + Vite)

### Prerequisites
- Node.js 18+

### Setup
1. Install dependencies:
   ```
   cd frontend
   npm install
   ```
2. Optional environment config:
   - Create `frontend/.env` with:
     ```
     VITE_API_BASE=http://localhost:8000/api
     ```
     If omitted, the app defaults to `http://localhost:8000/api`.
3. Run the dev server:
   ```
   npm run dev
   ```
4. Open the app:
   - Visit `http://localhost:5173`

### Frontend Basics
- `src/services/api.ts` points to `VITE_API_BASE` and calls `POST /api/chat`.
- `src/components/ChatBox.tsx` provides a minimal UI to send questions and display answers.

---

## Connecting Frontend and Backend
- Start backend on port 8000
- Start frontend on port 5173
- CORS origins can be set via `CORS_ORIGINS` (comma-separated) in `backend/.env`.

---

## API Reference

Base URL: `http://localhost:8000/api`

- Health
  - GET `/health`
    - Response: `{ "status": "healthy" }`
    - curl: `curl -s http://localhost:8000/api/health`

- Chat
  - POST `/chat/ask`
    - Body:
      ```json
      { "question": "What is in semester 1?", "session_id": "optional-session-id" }
      ```
    - Response:
      ```json
      {
        "answer": "string",
        "sources": [{ "index": 1, "name": "doc.pdf", "page": 3, "score": 0.123 }],
        "confidence": 0.76,
        "session_id": "uuid"
      }
      ```
    - curl:
      ```bash
      curl -s -X POST http://localhost:8000/api/chat/ask \
        -H "Content-Type: application/json" \
        -d '{"question":"What is in semester 1?"}'
      ```
    - fetch:
      ```js
      fetch('http://localhost:8000/api/chat/ask', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ question: 'What is in semester 1?' })
      }).then(r => r.json())
      ```

  - GET `/chat/history?session_id=<id>`
    - Response:
      ```json
      { "session_id": "uuid", "messages": [
        { "ts": 1731320000, "question": "Q", "answer": "A", "sources": [], "confidence": 0.7 }
      ]}
      ```

  - POST `/chat/sessions`
    - Response: `{ "session_id": "uuid" }`

  - GET `/chat/sessions`
    - Response: `[ { "session_id": "uuid", "message_count": 3, "updated_at": 1731320000 } ]`

  - DELETE `/chat/sessions/{session_id}`
    - Response: `{ "session_id": "uuid", "status": "deleted" }`

- Documents
  - POST `/documents/upload` (multipart)
    - Form-data: `file=@path/to/file.pdf`
    - Response: `{ "doc_id": "hash", "filename": "file.pdf", "status": "uploaded" }`
    - curl:
      ```bash
      curl -s -X POST http://localhost:8000/api/documents/upload -F "file=@./syllabus.pdf"
      ```
    - fetch:
      ```js
      const fd = new FormData(); fd.append('file', file);
      fetch('http://localhost:8000/api/documents/upload', { method:'POST', body: fd }).then(r=>r.json())
      ```

  - GET `/documents/list`
    - Response:
      ```json
      { "documents": [
        { "doc_id": "hash", "filename": "file.pdf", "status": "completed", "chunks": 42 }
      ]}
      ```

  - GET `/documents/status?doc_id=<id>`
    - Response:
      ```json
      { "doc_id":"hash","status":"processing","uploaded_bytes":1048576,"size":5242880,"detail":null,"chunks":0 }
      ```

  - DELETE `/documents/{doc_id}`
    - Response: `{ "doc_id": "hash", "status": "deleted" }`

### Errors
- 400 Bad Request: invalid file type, etc.
- 413 Payload Too Large: PDF exceeds limit (`UPLOAD_FILE_SIZE_LIMIT` MB).
- 422 Unprocessable Entity: request validation error.
- 429 Too Many Requests: upstream/LLM rate limiting (auto-retried internally).
- 500 Internal Server Error: unexpected server failure.

Response shape:
```json
{ "detail": "Message", "errors": [ { "loc": ["body","field"], "msg": "reason", "type": "type" } ] }
```

### Rate Limiting
- Gemini requests are locally rate-limited with a rolling window and exponential backoff for transient errors.
- For production, also enforce limits at the gateway/load balancer.

### Authentication
- None by default in this starter. For production, add API keys/JWT and restrict `CORS_ORIGINS`.

### End-to-end cURL
```bash
# upload
curl -s -X POST http://localhost:8000/api/documents/upload -F "file=@./syllabus.pdf"
# ask
curl -s -X POST http://localhost:8000/api/chat/ask -H "Content-Type: application/json" \
  -d '{"question":"List the core courses across semesters"}'
```

---


---

## Next Steps (Suggestions)
- Replace stub RAG:
  - Add a vector DB (FAISS/Chroma/Weaviate) and index syllabus documents.
  - Implement chunking and embeddings.
  - Integrate your chosen LLM (OpenAI/Azure/Ollama).
- Add conversation history in `ChatRequest`.
- Add authentication if needed.
- Improve UI/UX and add source citations UI.

---

## Troubleshooting
- If `.env` files are not created by the template, create them manually as shown above.
- Windows PowerShell execution policy may block venv activation; you can run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (run as Administrator) if needed.


