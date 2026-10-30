"""
Yoga Pose Classifier — Dataset2 Training Script (47 classes)
=============================================================
Pipeline:
  1. Extract dataset2.zip (flat class folders, no TRAIN/TEST split).
  2. For every image run MediaPipe PoseLandmarker to extract 33 landmarks.
  3. Hip-centred / torso-scale normalise  →  132-dim feature vector.
  4. Stratified 85/15 train-test split.
  5. Train a wider Keras MLP:
       Input(132) → BN → Dense(512,relu) → Drop(0.4)
                       → Dense(256,relu) → Drop(0.3)
                       → Dense(128,relu) → Drop(0.2)
                       → Dense(47, softmax)
  6. Export weights as plain JSON (weights.json) for the browser's
     pure-TypeScript forward pass in mlClassifier.ts.

Usage (from repo root):
  python ml_training/train_dataset2.py
"""

import io, json, zipfile, pathlib, sys
import numpy as np
import cv2
import mediapipe as mp
import tensorflow as tf
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.utils import class_weight as sk_class_weight

# ── paths ──────────────────────────────────────────────────────────────────────
ROOT       = pathlib.Path(__file__).parent.parent
ZIP_PATH   = ROOT / "dataset2.zip"
MODEL_TASK = ROOT / "ml_training" / "pose_landmarker.task"
OUT_DIR    = ROOT / "frontend" / "public" / "pose_model"
OUT_DIR.mkdir(parents=True, exist_ok=True)

assert ZIP_PATH.exists(),   f"dataset2.zip not found at {ZIP_PATH}"
assert MODEL_TASK.exists(), f"pose_landmarker.task not found at {MODEL_TASK}"

# ── only train on these 9 poses ────────────────────────────────────────────────
SELECTED_CLASSES = {
    "Trikonasana",
    "Vrksasana",
    "Balasana",
    "Padmasana",
    "Baddha Konasana",
    "Virabhadrasana Three",
    "Halasana",
    "Utkatasana",
    "Garudasana",
}

# ── MediaPipe Pose Landmarker (Tasks API) ──────────────────────────────────────
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

base_opts = mp_tasks.BaseOptions(model_asset_path=str(MODEL_TASK))
pose_opts = mp_vision.PoseLandmarkerOptions(
    base_options=base_opts,
    running_mode=VisionTaskRunningMode.IMAGE,
    num_poses=1,
    min_pose_detection_confidence=0.25,
    min_pose_presence_confidence=0.25,
    min_tracking_confidence=0.25,
)
DETECTOR = mp_vision.PoseLandmarker.create_from_options(pose_opts)

# ── landmark constants ─────────────────────────────────────────────────────────
L_HIP, R_HIP     = 23, 24
L_SHOULDER, R_SHOULDER = 11, 12
IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# ── normalisation (identical to browser mlClassifier.ts) ──────────────────────
def normalise(lms: np.ndarray) -> np.ndarray:
    """lms: (33,4) [x,y,z,vis] → (132,) float32"""
    hip_c = (lms[L_HIP, :3] + lms[R_HIP, :3]) / 2.0
    pts   = lms[:, :3] - hip_c
    sho_c = (lms[L_SHOULDER, :3] + lms[R_SHOULDER, :3]) / 2.0
    torso = np.linalg.norm(sho_c - lms[L_HIP, :3])
    pts  /= max(float(torso), 1e-6)
    return np.concatenate([pts, lms[:, 3:4]], axis=1).astype(np.float32).flatten()

def features_from_bytes(img_bytes: bytes):
    """Decode JPEG/PNG bytes → (132,) feature vector or None."""
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        return None
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    res = DETECTOR.detect(mp_img)
    if not res.pose_landmarks:
        return None
    lm_list = res.pose_landmarks[0]
    if len(lm_list) < 33:
        return None
    lms = np.array([[l.x, l.y, l.z, l.visibility] for l in lm_list], dtype=np.float32)
    return normalise(lms)

# ── load all images from zip ───────────────────────────────────────────────────
print(f"\n── Reading dataset2.zip ({ZIP_PATH.stat().st_size/1e6:.0f} MB) ──")
X_all, y_all = [], []
class_counts = {}

with zipfile.ZipFile(ZIP_PATH, "r") as zf:
    entries = [e for e in zf.infolist()
               if not e.is_dir()
               and pathlib.Path(e.filename).suffix.lower() in IMG_EXTS
               and e.file_size > 0
               and pathlib.Path(e.filename).parts[0] in SELECTED_CLASSES]

    # Build class list from selected folder names only
    all_classes = sorted({pathlib.Path(e.filename).parts[0] for e in entries})
    print(f"  Found {len(all_classes)} classes, {len(entries)} images total\n")

    for cls_name in all_classes:
        cls_entries = [e for e in entries
                       if pathlib.Path(e.filename).parts[0] == cls_name]
        ok = fail = 0
        for entry in cls_entries:
            img_bytes = zf.read(entry.filename)
            feat = features_from_bytes(img_bytes)
            if feat is not None:
                X_all.append(feat)
                y_all.append(cls_name)
                ok += 1
            else:
                fail += 1
        class_counts[cls_name] = ok
        print(f"  {cls_name:<40s}: {ok:5d} ok  {fail:4d} failed")

X = np.array(X_all, dtype=np.float32)
y_str = np.array(y_all)
print(f"\n  Total feature vectors: {len(X)}\n")

# ── label encode ───────────────────────────────────────────────────────────────
le = LabelEncoder()
y  = le.fit_transform(y_str)
classes     = list(le.classes_)          # sorted Sanskrit names
NUM_CLASSES = len(classes)
INPUT_DIM   = X.shape[1]                 # 132
print(f"Classes ({NUM_CLASSES}):\n  {classes}\n")

# ── stratified 85/15 split ─────────────────────────────────────────────────────
sss = StratifiedShuffleSplit(n_splits=1, test_size=0.15, random_state=42)
train_idx, test_idx = next(sss.split(X, y))
X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]
print(f"Train: {len(X_train)}  |  Test: {len(X_test)}\n")

# ── class weights ──────────────────────────────────────────────────────────────
cw_arr = sk_class_weight.compute_class_weight(
    "balanced", classes=np.unique(y_train), y=y_train)
class_weights = dict(enumerate(cw_arr))

# ── model ──────────────────────────────────────────────────────────────────────
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
], name="yoga_pose_mlp_9")

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)
model.summary()

callbacks = [
    tf.keras.callbacks.EarlyStopping(
        patience=18, restore_best_weights=True, verbose=1),
    tf.keras.callbacks.ReduceLROnPlateau(
        factor=0.5, patience=7, min_lr=1e-6, verbose=1),
]

print("\n── Training ──────────────────────────────────────────────")
model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=200,
    batch_size=64,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1,
)

loss, acc = model.evaluate(X_test, y_test, verbose=0)
print(f"\nTest accuracy : {acc*100:.2f}%")
print(f"Test loss     : {loss:.4f}\n")

# ── export weights.json ────────────────────────────────────────────────────────
print(f"── Exporting weights.json to {OUT_DIR}")

inference_layers = [
    l for l in model.layers
    if l.__class__.__name__ not in ("Dropout", "InputLayer")
]

layers_export = []
for layer in inference_layers:
    w   = layer.get_weights()
    cls = layer.__class__.__name__
    if cls == "BatchNormalization":
        layers_export.append({
            "type":     "batchnorm",
            "gamma":    w[0].tolist(),
            "beta":     w[1].tolist(),
            "mean":     w[2].tolist(),
            "variance": w[3].tolist(),
            "epsilon":  float(layer.epsilon),
        })
    elif cls == "Dense":
        layers_export.append({
            "type":       "dense",
            "activation": layer.get_config()["activation"],
            "kernel":     w[0].tolist(),
            "bias":       w[1].tolist(),
        })

weights_json = {
    "inputDim":  int(INPUT_DIM),
    "outputDim": int(NUM_CLASSES),
    "classes":   [str(c) for c in classes],   # plain Python strings
    "layers":    layers_export,
}

weights_path = OUT_DIR / "weights.json"
weights_path.write_text(json.dumps(weights_json), encoding="utf-8")
sz = weights_path.stat().st_size
print(f"  Wrote {weights_path}  ({sz/1e6:.2f} MB)")

# pose_classes.json (for compatibility with browser meta-loader)
(OUT_DIR / "pose_classes.json").write_text(
    json.dumps({"classes": [str(c) for c in classes], "inputDim": int(INPUT_DIM)},
               indent=2),
    encoding="utf-8",
)
print(f"  Wrote {OUT_DIR/'pose_classes.json'}")

print(f"\n  Classes  : {[str(c) for c in classes]}")
print(f"  Accuracy : {acc*100:.2f}%")
print("\nDone — model ready at frontend/public/pose_model/weights.json")
