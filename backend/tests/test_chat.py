from unittest.mock import patch


def test_create_session_and_ask(client):
	# Create a session
	create = client.post("/api/chat/sessions")
	assert create.status_code == 200
	session_id = create.json()["session_id"]

	# Mock Gemini response to ensure deterministic output
	with patch("app.services.gemini_service.GeminiService.generate_answer") as gen:
		gen.return_value = {"answer": "Test answer\n\nConfidence: high", "confidence": 0.9}
		resp = client.post("/api/chat/ask", json={"question": "Hello?", "session_id": session_id})

	assert resp.status_code == 200
	body = resp.json()
	assert body["answer"].startswith("Test answer")
	assert body["session_id"] == session_id
	assert "confidence_explanation" in body
	assert body.get("follow_up_question") is not None or body.get("follow_up_question") is None

	# History should contain at least one message
	h = client.get(f"/api/chat/history?session_id={session_id}")
	assert h.status_code == 200
	hist = h.json()
	assert hist["session_id"] == session_id
	assert isinstance(hist["messages"], list)


