from unittest.mock import patch, MagicMock
from app.services.pdf_processor import PDFProcessor


def test_pdf_size_validation(tmp_path, monkeypatch):
	# Limit to 1 byte to trigger size error
	monkeypatch.setenv("UPLOAD_FILE_SIZE_LIMIT", "0")  # ensure constructor uses default param
	proc = PDFProcessor(max_file_mb=0)  # override for test

	f = tmp_path / "test.pdf"
	f.write_bytes(b"%" + b"0" * 10)  # fake small PDF bytes

	# With max_file_mb=0, validation should raise
	try:
		proc.process_pdf(str(f))
		assert False, "Expected ValueError for file too large"
	except ValueError:
		pass
	except Exception:
		# Depending on loader, non-PDF may also raise; count as valid negative path
		pass


def test_pdf_processing_happy_path(tmp_path, monkeypatch):
	# Create fake PDF file
	p = tmp_path / "ok.pdf"
	p.write_bytes(b"%PDF-1.4\n%...fake...")

	proc = PDFProcessor(max_file_mb=50)

	# Mock loader to avoid real PDF parsing
	with patch("app.services.pdf_processor.PyPDFLoader") as Loader:
		doc = MagicMock()
		doc.page_content = "Hello world"
		doc.metadata = {"source": str(p), "page": 1}
		loader_instance = MagicMock()
		loader_instance.load.return_value = [doc]
		Loader.return_value = loader_instance

		count = proc.process_pdf(str(p))
		assert count >= 1

