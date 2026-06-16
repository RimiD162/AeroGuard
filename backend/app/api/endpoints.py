from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.services.detection_service import detection_service
from app.schemas.detection import DetectionResponse

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def health():
    return {"status": "ok"}

@router.post("/detect", response_model=DetectionResponse, status_code=status.HTTP_200_OK)
async def detect(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # Execute inference pipeline
    response = detection_service.run_detection(file_bytes, file.filename or "image.jpg")
    return response
