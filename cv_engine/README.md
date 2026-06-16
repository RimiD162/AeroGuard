# AeroGuard — Computer Vision Foundation (Phase 2)

This module contains the core training, evaluation, and inference pipelines for the AeroGuard defect detection system using YOLOv8.

## Technology Stack
- **Deep Learning**: YOLOv8 (Ultralytics), PyTorch, Torchvision
- **Image Processing**: OpenCV, Pillow, NumPy

---

## Directory Structure
```
cv_engine/
├── data.yaml            # YOLOv8 dataset configuration
├── requirements.txt     # Python package requirements
├── train.py            # CLI training utility
├── predict.py          # CLI prediction and inference utility
├── evaluate.py         # CLI model validation and metric reporting utility
├── weights/            # Local model weights directory (contains best.pt / last.pt)
└── outputs/            # Annotated images output directory
```

---

## Class Mapping & Dataset Setup

The 5 target defect types are mapped from baseline surface defects:
- **0: Crack**
- **1: Corrosion**
- **2: Dent**
- **3: Scratch**
- **4: Welding Defect**

### Preparing the Dataset
1. Organize your dataset in YOLO format as configured in `data.yaml`:
   ```
   dataset/
   ├── images/
   │   ├── train/
   │   └── val/
   └── labels/
       ├── train/
       └── val/
   ```
2. Annotations in the `labels` folders must use YOLO format (text files with one defect instance per line: `<class_id> <x_center> <y_center> <width> <height>`).
3. Ensure class IDs match the mapping above (0 to 4).

---

## Usage Instructions

### 1. Installation
Install the required dependencies inside your python environment:
```bash
pip install -r requirements.txt
```

### 2. Training the Model (`train.py`)
Run the training script on your dataset:
```bash
python train.py --epochs 50 --batch 16 --imgsz 640 --device cpu --model yolov8n.pt
```
- **Arguments**:
  - `--model`: Base model type (`yolov8n.pt` or `yolov8s.pt`, default: `yolov8n.pt`).
  - `--epochs`: Number of training epochs (default: `50`).
  - `--batch`: Training batch size (default: `16`).
  - `--imgsz`: Input image size (default: `640`).
  - `--device`: Target hardware device (`cpu`, `cuda`, or a GPU index like `0`, default: `cpu`).
- **Outputs**:
  - Training metrics and logs will be saved to `runs/train_run/`.
  - The final best and last model weights are automatically copied to `weights/best.pt` and `weights/last.pt`.

---

### 3. Evaluating Model Performance (`evaluate.py`)
Validate the model performance on the validation split:
```bash
python evaluate.py --weights weights/best.pt --data data.yaml
```
- **Outputs**:
  - Computes and prints Mean Precision, Mean Recall, mAP@0.5, and mAP@0.5:0.95.
  - Automatically exports the validation **confusion matrix** to the root folder as `confusion_matrix.png`.

---

### 4. Running Defect Prediction (`predict.py`)
Run inference on a single image file or raw base64 string:

#### A. Predict using a local image path:
```bash
python predict.py --image path/to/defect_image.jpg --weights weights/best.pt
```

#### B. Predict using a base64 encoded string:
```bash
python predict.py --base64 "iVBORw0KGgoAAA..." --weights weights/best.pt
```

- **Outputs**:
  - Outputs a structured JSON payload to standard output detailing the detected defect categories, bounding box coordinates, model confidences, and `area_ratio` (relative size of the defect compared to the full image).
  - Saves the annotated image with visual bounding boxes inside `outputs/`.
