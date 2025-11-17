import os
import tempfile
import shutil
import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="session", autouse=True)
def _set_test_env():
	# Keep uploads and chroma in temp dirs for tests
	os.environ.setdefault("APP_ENV", "development")
	os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
	os.environ.setdefault("UPLOAD_FILE_SIZE_LIMIT", "5")  # smaller for tests (MB)
	yield


@pytest.fixture()
def temp_dirs(monkeypatch):
	base_tmp = tempfile.mkdtemp(prefix="mca_test_")
	uploads = os.path.join(base_tmp, "uploads")
	chroma = os.path.join(base_tmp, "chroma_db")
	os.makedirs(uploads, exist_ok=True)
	os.makedirs(chroma, exist_ok=True)

	# Ensure StaticFiles mount points exist and services write here
	monkeypatch.setenv("PYTHONPATH", ".")
	# Some services use relative to app dir; we won't monkeypatch path resolution here
	yield {"base": base_tmp, "uploads": uploads, "chroma": chroma}
	shutil.rmtree(base_tmp, ignore_errors=True)


@pytest.fixture()
def client():
	app = create_app()
	with TestClient(app) as c:
		yield c


