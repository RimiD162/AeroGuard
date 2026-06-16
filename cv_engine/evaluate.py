import os
import argparse
import shutil
from ultralytics import YOLO

def parse_args():
    parser = argparse.ArgumentParser(description="AeroGuard Defect Detection YOLOv8 Evaluation Script")
    parser.add_argument("--weights", type=str, default="weights/best.pt", help="Path to weights file")
    parser.add_argument("--data", type=str, default="data.yaml", help="Path to data.yaml config")
    parser.add_argument("--project", type=str, default="runs", help="Project runs output folder")
    parser.add_argument("--name", type=str, default="val_run", help="Evaluation run folder name")
    return parser.parse_args()

def main():
    args = parse_args()

    # Load model
    weights_path = args.weights
    if not os.path.exists(weights_path):
        print(f"Warning: Weights not found at '{weights_path}'. Falling back to 'yolov8n.pt'.")
        weights_path = "yolov8n.pt"

    print(f"Loading model from {weights_path}...")
    model = YOLO(weights_path)

    # Verify dataset configuration exists
    if not os.path.exists(args.data):
        print(f"Error: Dataset configuration file not found at '{args.data}'")
        return

    abs_project = os.path.abspath(args.project)
    print(f"Running evaluation on validation set (saving to {abs_project})...")
    metrics = model.val(
        data=args.data,
        project=abs_project,
        name=args.name,
        exist_ok=True,
        verbose=False
    )

    print("\n================ EVALUATION SUMMARY ================")
    results = metrics.results_dict

    mp = results.get("metrics/precision(B)", 0.0)
    mr = results.get("metrics/recall(B)", 0.0)
    map50 = results.get("metrics/mAP50(B)", 0.0)
    map_all = results.get("metrics/mAP50-95(B)", 0.0)

    print(f"Overall Mean Precision (MP)    : {mp:.4f}")
    print(f"Overall Mean Recall (MR)       : {mr:.4f}")
    print(f"Overall mAP@0.5                : {map50:.4f}")
    print(f"Overall mAP@0.5:0.95           : {map_all:.4f}")
    print("====================================================\n")

    # Retrieve and copy confusion matrix
    val_run_dir = os.path.join(abs_project, args.name)
    conf_matrix_src = os.path.join(val_run_dir, "confusion_matrix.png")
    conf_matrix_dest = "confusion_matrix.png"

    if os.path.exists(conf_matrix_src):
        shutil.copy(conf_matrix_src, conf_matrix_dest)
        print(f"Confusion matrix image successfully saved to: {os.path.abspath(conf_matrix_dest)}")
    else:
        print(f"Validation reports saved to: {os.path.abspath(val_run_dir)}")

if __name__ == "__main__":
    main()
