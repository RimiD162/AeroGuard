import time
import io
from PIL import Image, ImageOps
from fastapi import HTTPException, status
from app.services.model_manager import model_manager
from app.core.config import settings
from app.core.logging import logger
from app.schemas.detection import DetectionItem, DetectionResponse, PerformanceMetrics

class DetectionService:
    @staticmethod
    def validate_image(file_bytes: bytes, filename: str) -> None:
        # Check size
        size_mb = len(file_bytes) / (1024 * 1024)
        if size_mb > settings.MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size ({size_mb:.2f} MB) exceeds maximum limit of {settings.MAX_FILE_SIZE_MB} MB."
            )

        # Check extension
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

    @staticmethod
    def run_detection(file_bytes: bytes, filename: str) -> DetectionResponse:
        total_start = time.perf_counter()

        # 1. Validate extension and size
        DetectionService.validate_image(file_bytes, filename)

        try:
            # 2. Parse Image with Pillow to verify it is valid
            image = Image.open(io.BytesIO(file_bytes))
            # Normalize orientation based on EXIF tag
            image = ImageOps.exif_transpose(image)
        except Exception as e:
            logger.error(f"Image parsing failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrupted or invalid image data."
            )

        # 3. Get YOLO Model (Singleton)
        yolo_model = model_manager.get_model()

        # 4. Perform Inference
        inference_start = time.perf_counter()
        try:
            results = yolo_model(image, conf=settings.CONFIDENCE_THRESHOLD, verbose=False)
        except Exception as e:
            logger.error(f"Inference execution failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Inference error: {str(e)}"
            )
        inference_time_ms = (time.perf_counter() - inference_start) * 1000

        # 5. Extract Detections
        detections = []
        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            names = result.names

            for box in boxes:
                xyxy = box.xyxy[0].tolist()
                confidence = float(box.conf[0].item())
                class_id = int(box.cls[0].item())
                class_name = names.get(class_id, f"class_{class_id}")

                detections.append(
                    DetectionItem(
                        class_name=class_name,
                        confidence=round(confidence, 4),
                        bbox=[round(coord, 2) for coord in xyxy]
                    )
                )

        total_time_ms = (time.perf_counter() - total_start) * 1000

        # Build response
        response = DetectionResponse(
            detections=detections,
            metrics=PerformanceMetrics(
                inference_time_ms=round(inference_time_ms, 2),
                total_time_ms=round(total_time_ms, 2)
            )
        )

        logger.info(f"Processed detection for '{filename}' in {total_time_ms:.2f}ms. Detections count: {len(detections)}")
        return response

detection_service = DetectionService()
