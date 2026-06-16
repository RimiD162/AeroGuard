# Implementation Plan - Phase 2: Computer Vision Foundation

Implement the foundational Computer Vision pipeline for defect detection using YOLOv8, including scripts for model training, evaluation, inference, and dataset configuration.

---

## Architecture Design & Model Strategy

We will place all computer vision assets in a dedicated `cv_engine/` directory.

### Directory Structure
```
cv_engine/
├── data.yaml            # YOLOv8 dataset configuration
├── requirements.txt     # Python package dependencies
├── train.py            # Model training entrypoint
├── predict.py          # Model inference and prediction entrypoint
├── evaluate.py         # Validation and evaluation entrypoint
├── weights/            # Local model weights storage
└── outputs/            # Inference annotated images output directory
```

### Class Mapping (NEU baseline)
The 5 target classes will be mapped from baseline surface defects:
- **0: Crack** (mapped from NEU Crazing / cracks)
- **1: Corrosion** (mapped from NEU Patches / pitted surfaces)
- **2: Dent** (mapped from NEU Pitted surfaces / mechanical dents)
- **3: Scratch** (mapped from NEU Scratches)
- **4: Welding Defect** (mapped from NEU Inclusion / rolled-in scale)

---

## Proposed Changes

### [NEW] Computer Vision Engine (`cv_engine/`)

---

#### [NEW] [requirements.txt](file:///c:/Users/ishit/Downloads/AeroGuard-main/AeroGuard-main/cv_engine/requirements.txt)
Define CV-specific package dependencies (`ultralytics`, `torch`, `torchvision`, `opencv-python`, `numpy`, `Pillow`).

#### [NEW] [data.yaml](file:///c:/Users/ishit/Downloads/AeroGuard-main/AeroGuard-main/cv_engine/data.yaml)
Set up dataset paths (relative to dataset root) and define 5 defect classes with their IDs.

#### [NEW] [train.py](file:///c:/Users/ishit/Downloads/AeroGuard-main/AeroGuard-main/cv_engine/train.py)
Provide a command-line script to load base nano/small YOLOv8 models, run training, export the weights (`best.pt`, `last.pt`) to `cv_engine/weights/`, and output training runs.

#### [NEW] [predict.py](file:///c:/Users/ishit/Downloads/AeroGuard-main/AeroGuard-main/cv_engine/predict.py)
Provide prediction pipeline:
- Supports loading images from standard file paths or raw base64 data.
- Calculates `area_ratio` for detected bounding boxes.
- Exports annotated result images with visual overlays to `cv_engine/outputs/`.

#### [NEW] [evaluate.py](file:///c:/Users/ishit/Downloads/AeroGuard-main/AeroGuard-main/cv_engine/evaluate.py)
Provide evaluation script computing:
- Precision, Recall, mAP@0.5, and mAP@0.5:0.95.
- Per-class metrics reporting.
- Confusion matrix mapping.

---

## Verification Plan

### Automated Tests & Pipeline Dry-Runs
1. We will verify dependency correctness by setting up a python environment for `cv_engine/`.
2. We will run a validation dry-run using a dummy dataset structure to check script arguments and model compatibility.

### Manual Verification
- Verify prediction execution on a test image:
  `python cv_engine/predict.py --image path/to/image.jpg --weights yolov8n.pt`
- Verify evaluation runs without errors:
  `python cv_engine/evaluate.py --weights yolov8n.pt`
