import os
import argparse
import base64
import json
import io
from PIL import Image
from ultralytics import YOLO

def parse_args():
    parser = argparse.ArgumentParser(description="AeroGuard Defect Detection YOLOv8 Inference Script")
    parser.add_argument("--image", type=str, default=None, help="Path to input image file")
    parser.add_argument("--base64", type=str, default=None, help="Base64 encoded string of input image")
    parser.add_argument("--weights", type=str, default="weights/best.pt", help="Path to model weights file")
    parser.add_argument("--output-dir", type=str, default="outputs", help="Directory to save annotated image")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    return parser.parse_args()

def main():
    args = parse_args()

    # Load weights
    model_path = args.weights
    if not os.path.exists(model_path):
        print(f"Warning: Weights not found at '{model_path}'. Falling back to 'yolov8n.pt'.")
        model_path = "yolov8n.pt"

    model = YOLO(model_path)

    image = None
    filename = "detection_result.jpg"

    if args.image:
        if not os.path.exists(args.image):
            print(json.dumps({"error": f"Image file not found at '{args.image}'"}))
            return
        image = Image.open(args.image)
        filename = os.path.basename(args.image)
    elif args.base64:
        try:
            img_data = base64.b64decode(args.base64)
            image = Image.open(io.BytesIO(img_data))
        except Exception as e:
            print(json.dumps({"error": f"Failed to decode base64 image: {str(e)}"}))
            return
    else:
        print(json.dumps({"error": "Either --image or --base64 must be provided."}))
        return

    # Execute YOLO inference
    results = model(image, conf=args.conf, verbose=False)

    detections = []
    if len(results) > 0:
        result = results[0]
        boxes = result.boxes
        names = result.names

        # Get image dimensions
        img_w, img_h = image.size
        img_area = img_w * img_h

        # Save annotated image output
        os.makedirs(args.output_dir, exist_ok=True)
        output_path = os.path.join(args.output_dir, f"annotated_{filename}")
        result.save(filename=output_path)

        for box in boxes:
            xyxy = box.xyxy[0].tolist()
            confidence = float(box.conf[0].item())
            class_id = int(box.cls[0].item())
            class_name = names.get(class_id, f"class_{class_id}")

            # Calculate bbox area and area ratio relative to full image
            bbox_w = xyxy[2] - xyxy[0]
            bbox_h = xyxy[3] - xyxy[1]
            bbox_area = bbox_w * bbox_h
            area_ratio = bbox_area / img_area if img_area > 0 else 0.0

            detections.append({
                "class_name": class_name,
                "confidence": round(confidence, 4),
                "bbox": [round(coord, 2) for coord in xyxy],
                "area_ratio": round(area_ratio, 6)
            })

        print(json.dumps({
            "detections": detections,
            "annotated_saved_at": output_path
        }, indent=2))
    else:
        print(json.dumps({"detections": [], "message": "No detections found."}))

if __name__ == "__main__":
    main()
