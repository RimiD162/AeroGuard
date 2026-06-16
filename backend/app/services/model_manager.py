import os
import torch
from ultralytics import YOLO
from app.core.config import settings
from app.core.logging import logger

class ModelManager:
    _instance = None
    model = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ModelManager, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def load_model(self):
        if self.model is not None:
            logger.info("YOLO model already loaded.")
            return

        model_path = settings.YOLO_MODEL_PATH
        device = settings.DEVICE

        # Device fallback logic (check CUDA availability)
        if device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA selected but GPU is not available. Falling back to CPU.")
            device = "cpu"

        logger.info(f"Loading YOLO model from {model_path} on device {device}...")

        # Ensure directory exists for model weights
        os.makedirs(os.path.dirname(model_path) or "models", exist_ok=True)

        try:
            # Load the YOLO model (Ultralytics handles download if path does not exist)
            self.model = YOLO(model_path)
            # Send model to device
            self.model.to(device)
            logger.info("YOLO model loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise e

    def get_model(self) -> YOLO:
        if self.model is None:
            self.load_model()
        return self.model

    def unload_model(self):
        self.model = None
        logger.info("YOLO model unloaded.")

model_manager = ModelManager()
