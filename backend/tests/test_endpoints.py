import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.services.model_manager import model_manager

@pytest.fixture(scope="module")
def client():
    # Use TestClient with 'with' context manager to trigger lifespan events (model loading)
    with TestClient(app) as c:
        yield c

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_model_loaded_on_startup():
    # Verify ModelManager loaded and cached the YOLO model
    assert model_manager.get_model() is not None

def test_detect_successful(client):
    # Create a small valid JPEG image in memory
    img = Image.new("RGB", (100, 100), color="blue")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="JPEG")
    img_bytes.seek(0)

    response = client.post(
        "/detect",
        files={"file": ("test_image.jpg", img_bytes, "image/jpeg")}
    )

    assert response.status_code == 200
    data = response.json()
    assert "detections" in data
    assert "metrics" in data
    assert isinstance(data["detections"], list)
    assert "inference_time_ms" in data["metrics"]
    assert "total_time_ms" in data["metrics"]

def test_detect_invalid_format(client):
    # Test uploading a text file (unsupported format)
    response = client.post(
        "/detect",
        files={"file": ("test.txt", io.BytesIO(b"plain text content"), "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_detect_missing_file(client):
    # Test request with missing file form data
    response = client.post("/detect")
    assert response.status_code == 422

def test_detect_corrupted_file(client):
    # Test uploading corrupted image binary data
    corrupted_bytes = io.BytesIO(b"not a real image stream data")
    response = client.post(
        "/detect",
        files={"file": ("corrupted.jpg", corrupted_bytes, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "Corrupted or invalid image data" in response.json()["detail"]

def test_detect_file_too_large(client):
    # Create a dummy payload larger than 15MB to trigger size limit validation
    large_bytes = io.BytesIO(b"\0" * (16 * 1024 * 1024))
    response = client.post(
        "/detect",
        files={"file": ("large_image.jpg", large_bytes, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "exceeds maximum limit" in response.json()["detail"]
