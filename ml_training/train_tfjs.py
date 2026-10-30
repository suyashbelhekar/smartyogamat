import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

"""
Yoga Pose Classifier - Training Script
=======================================
Pipeline:
  1. Walk DATASET/TRAIN and DATASET/TEST image folders.
  2. For each image run MediaPipe PoseLandmarker (Tasks API) to get 33 landmarks.
  3. Hip-centred / torso-scale normalise → 132-dim feature vector.
  4. Train a Keras MLP (256 → 128 → 64 → softmax) with early stopping.
  5. Manually export as TF.js LayersModel JSON + binary weights file.
  6. Write pose_classes.json so the browser knows the class order.

Usage (from repo root):
  python ml_training/train_tfjs.py
"""

import json
import pathlib
import numpy as np
import cv2
import mediapipe as mp
import tensorflow as tf
from sklearn.preprocessing import LabelEncoder
from sklearn.utils import class_weight

from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

# -- paths --------------------------------------------------------------------─
ROOT        = pathlib.Path(__file__).parent.parent
DATASET_DIR = ROOT / "dataset" / "DATASET"
TRAIN_DIR   = DATASET_DIR / "TRAIN"
TEST_DIR    = DATASET_DIR / "TEST"
MODEL_TASK  = ROOT / "ml_training" / "pose_landmarker.task"
OUT_DIR     = ROOT / "frontend" / "public" / "pose_model"
OUT_DIR.mkdir(parents=True, exist_ok=True)

assert MODEL_TASK.exists(), f"pose_landmarker.task not found at {MODEL_TASK}"

# -- MediaPipe Tasks PoseLandmarker --------------------------------------------─
base_opts  = mp_tasks.BaseOptions(model_asset_path=str(MODEL_TASK))
pose_opts  = mp_vision.PoseLandmarkerOptions(
    base_options=base_opts,
    running_mode=VisionTaskRunningMode.IMAGE,
    num_poses=1,
    min_pose_detection_confidence=0.3,
    min_pose_presence_confidence=0.3,
    min_tracking_confidence=0.3,
)
DETECTOR = mp_vision.PoseLandmarker.create_from_options(pose_opts)

# -- landmark constants --------------------------------------------------------─
LEFT_HIP       = 23
RIGHT_HIP      = 24
LEFT_SHOULDER  = 11
RIGHT_SHOULDER = 12

# -- feature extraction --------------------------------------------------------─
def normalise_landmarks(lms: np.ndarray) -> np.ndarray:
    """
    Hip-centred, torso-scale normalisation.
    lms: (33, 4)  columns = [x, y, z, visibility]
    Returns: (132,) float32
    """
    hip_c  = (lms[LEFT_HIP, :3]  + lms[RIGHT_HIP, :3])  / 2.0
    pts    = lms[:, :3] - hip_c
    sho_c  = (lms[LEFT_SHOULDER, :3] + lms[RIGHT_SHOULDER, :3]) / 2.0
    torso  = np.linalg.norm(sho_c - lms[LEFT_HIP, :3])
    scale  = max(float(torso), 1e-6)
    pts   /= scale
    vis    = lms[:, 3:4]
    return np.concatenate([pts, vis], axis=1).astype(np.float32).flatten()


def extract_features(image_path: str):
    """Return (132,) feature vector or None if pose not detected."""
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        return None
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    mp_img  = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=img_rgb,
    )
    result = DETECTOR.detect(mp_img)
    if not result.pose_landmarks or len(result.pose_landmarks) == 0:
        return None
    lm_list = result.pose_landmarks[0]
    if len(lm_list) < 33:
        return None
    lms = np.array([[lm.x, lm.y, lm.z, lm.visibility] for lm in lm_list],
                   dtype=np.float32)
    return normalise_landmarks(lms)


# -- dataset loading ------------------------------------------------------------
IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp"}

def load_split(split_dir: pathlib.Path, split_name: str):
    cache_dir = ROOT / "ml_training" / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_x = cache_dir / f"X_{split_name}.npy"
    cache_y = cache_dir / f"y_{split_name}.npy"

    classes = sorted([d.name for d in split_dir.iterdir() if d.is_dir()])
    total_files = sum(len([f for f in (split_dir / cls).iterdir() if f.suffix.lower() in IMG_EXTS]) for cls in classes)

    if cache_x.exists() and cache_y.exists():
        X = np.load(cache_x)
        y = np.load(cache_y)
        # Check if cache matches current class set
        cached_classes = sorted(list(set(y)))
        if cached_classes == classes:
            print(f"  Loaded {len(X)} samples from cache ({cache_x.name})")
            return X, y

    X, y = [], []
    for cls in classes:
        cls_dir = split_dir / cls
        files   = [f for f in cls_dir.iterdir() if f.suffix.lower() in IMG_EXTS]
        ok = fail = 0
        for f in files:
            feat = extract_features(str(f))
            if feat is not None:
                X.append(feat)
                y.append(cls)
                ok += 1
            else:
                fail += 1
        print(f"  {cls:25s}: {ok:4d} extracted, {fail:3d} failed")

    X_arr = np.array(X, dtype=np.float32)
    y_arr = np.array(y)
    np.save(cache_x, X_arr)
    np.save(cache_y, y_arr)
    return X_arr, y_arr


print("\n-- Loading TRAIN split ----------------------------------─")
X_train, y_train_str = load_split(TRAIN_DIR, 'train')
print(f"  Total: {len(X_train)} samples\n")

print("-- Loading TEST split ------------------------------------")
X_test, y_test_str = load_split(TEST_DIR, 'test')
print(f"  Total: {len(X_test)} samples\n")

# -- label encoding ------------------------------------------------------------─
le = LabelEncoder()
le.fit(np.concatenate([y_train_str, y_test_str]))
classes     = list(le.classes_)
print(f"Classes ({len(classes)}): {classes}\n")

y_train     = le.transform(y_train_str)
y_test      = le.transform(y_test_str)
NUM_CLASSES = len(classes)
INPUT_DIM   = X_train.shape[1]   # 132

cw = class_weight.compute_class_weight("balanced",
                                        classes=np.unique(y_train), y=y_train)
class_weights = dict(enumerate(cw))

# -- model ----------------------------------------------------------------------
tf.random.set_seed(42)

model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(INPUT_DIM,)),
    tf.keras.layers.BatchNormalization(),
    tf.keras.layers.Dense(256, activation="relu"),
    tf.keras.layers.Dropout(0.35),
    tf.keras.layers.Dense(128, activation="relu"),
    tf.keras.layers.Dropout(0.25),
    tf.keras.layers.Dense(64, activation="relu"),
    tf.keras.layers.Dropout(0.15),
    tf.keras.layers.Dense(NUM_CLASSES, activation="softmax"),
], name="yoga_pose_mlp")

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)
model.summary()

callbacks = [
    tf.keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True, verbose=1),
    tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=6, verbose=1),
]

print("\n-- Training ----------------------------------------------")
model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=150,
    batch_size=32,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1,
)

loss, acc = model.evaluate(X_test, y_test, verbose=0)
print(f"\nTest accuracy: {acc*100:.1f}%  |  Test loss: {loss:.4f}\n")

# -- export weights as simple JSON for browser inference ----------------------─
# We skip TF.js format (compatibility issues) and export weights directly.
# The browser does the MLP forward pass in plain TypeScript - no TF.js needed.
print(f"-- Exporting model weights to {OUT_DIR} ----------------")

# Collect weights layer by layer in inference order (skip Dropout - inactive at inference)
inference_layers = [l for l in model.layers if l.__class__.__name__ not in ('Dropout', 'InputLayer')]

layers_export = []
for layer in inference_layers:
    w = layer.get_weights()
    cls = layer.__class__.__name__
    if cls == "BatchNormalization":
        # w = [gamma, beta, moving_mean, moving_variance]
        layers_export.append({
            "type": "batchnorm",
            "gamma":    w[0].tolist(),
            "beta":     w[1].tolist(),
            "mean":     w[2].tolist(),
            "variance": w[3].tolist(),
            "epsilon":  float(layer.epsilon),
        })
    elif cls == "Dense":
        activation = layer.get_config()["activation"]
        layers_export.append({
            "type":       "dense",
            "activation": activation,
            "kernel":     w[0].tolist(),   # shape [in, out]
            "bias":       w[1].tolist(),   # shape [out]
        })

weights_json = {
    "inputDim": int(INPUT_DIM),
    "outputDim": int(NUM_CLASSES),
    "classes": classes,
    "layers": layers_export,
}

weights_path = OUT_DIR / "weights.json"
weights_path.write_text(json.dumps(weights_json))
print(f"  Wrote {weights_path}  ({weights_path.stat().st_size:,} bytes)")

# Also write pose_classes.json for compatibility
meta = {
    "classes": classes,
    "inputDim": int(INPUT_DIM),
}
(OUT_DIR / "pose_classes.json").write_text(json.dumps(meta, indent=2))
print(f"  Wrote {OUT_DIR / 'pose_classes.json'}")

print(f"\n  Classes: {classes}")
print(f"  Test accuracy: {acc*100:.1f}%")
print("\nDone - model exported to frontend/public/pose_model/")
