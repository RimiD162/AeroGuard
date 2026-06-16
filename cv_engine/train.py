import os
import argparse
import shutil
from ultralytics import YOLO

def parse_args():
    parser = argparse.ArgumentParser(description="AeroGuard Defect Detection YOLOv8 Training Script")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Base model (yolov8n.pt or yolov8s.pt)")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu, cuda, or GPU index like 0)")
    parser.add_argument("--data", type=str, default="data.yaml", help="Path to data.yaml config")
    return parser.parse_args()

def main():
    args = parse_args()

    # Verify dataset configuration exists
    if not os.path.exists(args.data):
        print(f"Error: Dataset configuration file not found at '{args.data}'")
        return

    print(f"Initializing base YOLOv8 model: {args.model}")
    model = YOLO(args.model)

    print(f"Starting training on device '{args.device}' for {args.epochs} epochs (batch={args.batch}, imgsz={args.imgsz})...")

    abs_project = os.path.abspath("runs")
    # Run model training
    # Output saves under runs/train_run
    model.train(
        data=args.data,
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        project=abs_project,
        name="train_run",
        exist_ok=True
    )

    # Copy output weights to local weights folder
    weights_dir = "weights"
    os.makedirs(weights_dir, exist_ok=True)

    best_weights_path = os.path.join(abs_project, "train_run", "weights", "best.pt")
    last_weights_path = os.path.join(abs_project, "train_run", "weights", "last.pt")

    if os.path.exists(best_weights_path):
        shutil.copy(best_weights_path, os.path.join(weights_dir, "best.pt"))
        print(f"Best weights successfully saved to: {os.path.join(weights_dir, 'best.pt')}")
    else:
        print("Warning: best.pt weights not found in runs folder.")

    if os.path.exists(last_weights_path):
        shutil.copy(last_weights_path, os.path.join(weights_dir, "last.pt"))
        print(f"Last weights successfully saved to: {os.path.join(weights_dir, 'last.pt')}")

    print("Training process finished.")

if __name__ == "__main__":
    main()
