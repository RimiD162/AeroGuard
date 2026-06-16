import os
from PIL import Image

def main():
    base_dir = "dataset"
    dirs = [
        "images/train",
        "images/val",
        "labels/train",
        "labels/val"
    ]
    for d in dirs:
        os.makedirs(os.path.join(base_dir, d), exist_ok=True)

    # Create dummy images
    img = Image.new("RGB", (100, 100), color="blue")
    img.save(os.path.join(base_dir, "images/train/dummy.jpg"))
    img.save(os.path.join(base_dir, "images/val/dummy.jpg"))

    # Create dummy label annotations (YOLO format: class_id x_center y_center width height)
    label_content = "0 0.5 0.5 0.2 0.2\n"
    with open(os.path.join(base_dir, "labels/train/dummy.txt"), "w") as f:
        f.write(label_content)
    with open(os.path.join(base_dir, "labels/val/dummy.txt"), "w") as f:
        f.write(label_content)

    print("Dummy dataset created successfully.")

if __name__ == "__main__":
    main()
