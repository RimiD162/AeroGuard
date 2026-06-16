# AeroGuard Detection Service

A standalone, production-ready microservice wrapping YOLOv8 (Ultralytics) with FastAPI for intelligent aircraft defect and anomaly detection.

## Technology Stack
- **Python**: 3.11 / 3.13
- **Deep Learning**: YOLOv8 (Ultralytics), PyTorch
- **Web API**: FastAPI, Uvicorn
- **Image Processing**: OpenCV (Headless), Pillow, NumPy
- **Orchestration**: Docker, Docker Compose

---

## Getting Started

### Prerequisites
- Python 3.11+
- Docker & Docker Compose (optional, for containerized execution)

### Running Locally

1. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Verify the server is running**:
   - Health check: `curl http://localhost:8000/health`
   - Interactive Swagger docs: `http://localhost:8000/docs`

---

### Running with Docker

1. **Build and start the container**:
   ```bash
   docker compose up --build
   ```

2. **Verify endpoints**:
   - Health Check: `curl http://localhost:8000/health`
   - Swagger UI: `http://localhost:8000/docs`

---

## API Documentation

### 1. Health Check
- **Endpoint**: `GET /health`
- **Description**: Verifies that the API service and preloaded model are operational.
- **Response**:
  ```json
  {
    "status": "ok"
  }
  ```

### 2. Run Image Inference
- **Endpoint**: `POST /detect`
- **Format**: `multipart/form-data`
- **Parameters**:
  - `file`: Image file (supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, maximum size: 15MB)
- **Response**:
  ```json
  {
    "detections": [
      {
        "class_name": "airplane",
        "confidence": 0.9234,
        "bbox": [50.5, 120.0, 310.2, 450.0]
      }
    ],
    "metrics": {
      "inference_time_ms": 112.45,
      "total_time_ms": 134.12
    }
  }
  ```

---

## Model Replacement Process
By default, the service utilizes a pre-trained `yolov8n.pt` model weights file which auto-downloads on startup to the `models/` directory.

To replace it with a custom-trained model (e.g. `best.pt` for aircraft component defects):
1. Copy your custom weights file (e.g., `best.pt`) into the `backend/models/` folder.
2. Update the environment configuration. You can do this in `docker-compose.yml` or via your local environment variable:
   ```bash
   # In docker-compose.yml:
   environment:
     - YOLO_MODEL_PATH=models/best.pt
   ```
3. Restart the service. The startup hook will automatically load the new model into memory.

---

## Testing

Run the automated test suite using pytest:
```bash
python -m pytest tests/ -v
```

The test suite covers:
1. Model manager loading at startup.
2. API health endpoint.
3. Successful detection on valid images.
4. Blocked file formats (e.g., `.txt`).
5. Missing file payloads.
6. Corrupted image streams.
7. File size limits (exceeding 15MB).
