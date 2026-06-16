from pydantic import BaseModel, Field
from typing import List

class DetectionItem(BaseModel):
    class_name: str = Field(..., description="The name of the detected object class")
    confidence: float = Field(..., description="The model confidence score (0.0 to 1.0)")
    bbox: List[float] = Field(..., description="Bounding box coordinates [x1, y1, x2, y2]")

class PerformanceMetrics(BaseModel):
    inference_time_ms: float = Field(..., description="Model inference duration in milliseconds")
    total_time_ms: float = Field(..., description="Total pipeline execution duration in milliseconds")

class DetectionResponse(BaseModel):
    detections: List[DetectionItem] = Field(..., description="List of detected anomalies or objects")
    metrics: PerformanceMetrics = Field(..., description="Performance timing metrics")
