import sys
import os
import json
import time
import pathlib
import numpy as np
import cv2
import mediapipe as mp
import tensorflow as tf
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support
from sklearn.utils import class_weight

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = pathlib.Path(__file__).parent.parent.resolve()
ML_DIR = ROOT / "ml_training"
CACHE_DIR = ML_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

INDIVIDUAL_DIR = ML_DIR / "individual_models"
INDIVIDUAL_DIR.mkdir(parents=True, exist_ok=True)

TRAINED_DIR = ML_DIR / "trained_model"
TRAINED_DIR.mkdir(parents=True, exist_ok=True)

FRONTEND_OUT = ROOT / "frontend" / "public" / "pose_model"
FRONTEND_OUT.mkdir(parents=True, exist_ok=True)

MODEL_TASK = ML_DIR / "pose_landmarker.task"
assert MODEL_TASK.exists(), f"pose_landmarker.task not found at {MODEL_TASK}"

# ── 9 Target Poses Configuration ───────────────────────────────────────────────
# Ordered strictly alphabetically as expected by frontend / weights.json:
CLASSES = [
    'ardhamatsyendrasana',
    'baddhakonasana',
    'dandasana',
    'downdog',
    'goddess',
    'padmasana',
    'plank',
    'tree',
    'warrior2'
]

# Mapping of the user's uploaded folders to target classes:
FOLDER_TO_CLASS = {
    'adho mukha svanasana': 'downdog',
    'ardha matsyendrasana': 'ardhamatsyendrasana',
    'baddha konasana': 'baddhakonasana',
    'dandasana': 'dandasana',
    'padmasana': 'padmasana',
    'phalakasana': 'plank',
    'utkatasana': 'goddess',
    'virabhadrasana ii': 'warrior2',
    'vriksasana': 'tree'
}

# ── MediaPipe Tasks PoseLandmarker Setup ────────────────────────────────────────
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

LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

def normalise_landmarks(lms: np.ndarray) -> np.ndarray:
    """
    Hip-centred, torso-scale normalisation.
    lms: (33, 4)  columns = [x, y, z, visibility]
    Returns: (132,) float32
    """
    hip_c = (lms[LEFT_HIP, :3] + lms[RIGHT_HIP, :3]) / 2.0
    pts = lms[:, :3] - hip_c
    sho_c = (lms[LEFT_SHOULDER, :3] + lms[RIGHT_SHOULDER, :3]) / 2.0
    torso = np.linalg.norm(sho_c - lms[LEFT_HIP, :3])
    scale = max(float(torso), 1e-6)
    pts /= scale
    vis = lms[:, 3:4]
    return np.concatenate([pts, vis], axis=1).astype(np.float32).flatten()

def extract_features_from_file(image_path: pathlib.Path):
    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        return None
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
    result = DETECTOR.detect(mp_img)
    if not result.pose_landmarks or len(result.pose_landmarks) == 0:
        return None
    lm_list = result.pose_landmarks[0]
    if len(lm_list) < 33:
        return None
    lms = np.array([[lm.x, lm.y, lm.z, lm.visibility] for lm in lm_list], dtype=np.float32)
    return normalise_landmarks(lms)

# ── Feature Extraction & Dataset Building ──────────────────────────────────────
def get_features_for_pose(pose_class: str, folder_name: str):
    cache_file = CACHE_DIR / f"features_{pose_class}.npy"
    if cache_file.exists():
        data = np.load(cache_file)
        print(f"[{pose_class}] Loaded {len(data)} cached feature vectors.")
        return data

    folder_path = ROOT / folder_name
    if not folder_path.exists():
        folder_path = ROOT.parent / folder_name

    img_files = [f for f in folder_path.rglob('*') if f.suffix.lower() in IMG_EXTS]
    print(f"[{pose_class}] Extracting features from {len(img_files)} images in '{folder_path}'...")
    
    feats = []
    t0 = time.time()
    for idx, f in enumerate(img_files):
        feat = extract_features_from_file(f)
        if feat is not None:
            feats.append(feat)
        if (idx + 1) % 50 == 0 or (idx + 1) == len(img_files):
            print(f"  Processed {idx + 1}/{len(img_files)} (extracted: {len(feats)})...")

    # Also augment with existing training/test samples if present to ensure maximum variety
    existing_train_dir = ROOT / "dataset" / "DATASET" / "TRAIN" / pose_class
    existing_test_dir = ROOT / "dataset" / "DATASET" / "TEST" / pose_class
    for ed in [existing_train_dir, existing_test_dir]:
        if ed.exists():
            e_files = [f for f in ed.iterdir() if f.suffix.lower() in IMG_EXTS]
            print(f"  Adding {len(e_files)} reference samples from {ed.name}/{pose_class}...")
            for f in e_files:
                feat = extract_features_from_file(f)
                if feat is not None:
                    feats.append(feat)

    arr = np.array(feats, dtype=np.float32)
    np.save(cache_file, arr)
    dt = time.time() - t0
    print(f"[{pose_class}] Saved {len(arr)} total features to cache in {dt:.1f}s.\n")
    return arr

def build_full_dataset():
    print("=" * 65)
    print(" STEP 1: FEATURE EXTRACTION FOR ALL 9 POSES")
    print("=" * 65)
    
    X_list, y_list = [], []
    pose_counts = {}

    for folder_name, pose_class in FOLDER_TO_CLASS.items():
        feats = get_features_for_pose(pose_class, folder_name)
        X_list.append(feats)
        y_list.extend([pose_class] * len(feats))
        pose_counts[pose_class] = len(feats)

    X = np.vstack(X_list)
    y = np.array(y_list)
    print("\nDataset Summary:")
    for cls in CLASSES:
        print(f"  {cls:20s}: {pose_counts.get(cls, 0):4d} valid samples")
    print(f"  Total samples: {len(X)}")

    # Stratified 80/20 train/test split
    sss = StratifiedShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_idx, test_idx = next(sss.split(X, y))
    
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    print(f"\nTrain split: {len(X_train)} samples | Test split: {len(X_test)} samples\n")
    return X_train, y_train, X_test, y_test

# ── Model Builder Helpers ──────────────────────────────────────────────────────
INPUT_DIM = 132

def create_pose_specialist_model(pose_name: str) -> tf.keras.Model:
    """Individual model for a single pose (binary specialist detector)."""
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(INPUT_DIM,), name=f"input_{pose_name}"),
        tf.keras.layers.BatchNormalization(name=f"bn_{pose_name}"),
        tf.keras.layers.Dense(256, activation="relu", name=f"dense256_{pose_name}"),
        tf.keras.layers.Dropout(0.35, name=f"drop1_{pose_name}"),
        tf.keras.layers.Dense(128, activation="relu", name=f"dense128_{pose_name}"),
        tf.keras.layers.Dropout(0.25, name=f"drop2_{pose_name}"),
        tf.keras.layers.Dense(64, activation="relu", name=f"dense64_{pose_name}"),
        tf.keras.layers.Dropout(0.15, name=f"drop3_{pose_name}"),
        tf.keras.layers.Dense(1, activation="sigmoid", name=f"out_{pose_name}")
    ], name=f"specialist_{pose_name}")
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.Precision(name="precision"), tf.keras.metrics.Recall(name="recall")]
    )
    return model

def create_aggregated_multiclass_model(num_classes: int = 9) -> tf.keras.Model:
    """Master multiclass model matching existing system format exactly."""
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(INPUT_DIM,), name="input_pose"),
        tf.keras.layers.BatchNormalization(name="batch_normalization"),
        tf.keras.layers.Dense(256, activation="relu", name="dense_256"),
        tf.keras.layers.Dropout(0.35, name="dropout_1"),
        tf.keras.layers.Dense(128, activation="relu", name="dense_128"),
        tf.keras.layers.Dropout(0.25, name="dropout_2"),
        tf.keras.layers.Dense(64, activation="relu", name="dense_64"),
        tf.keras.layers.Dropout(0.15, name="dropout_3"),
        tf.keras.layers.Dense(num_classes, activation="softmax", name="dense_output")
    ], name="yoga_pose_mlp")
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=5e-4),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model

# ── Train Individual Pose Models ───────────────────────────────────────────────
def train_individual_models(X_train, y_train, X_test, y_test):
    print("=" * 65)
    print(" STEP 2: TRAINING SEPARATE MODELS FOR EACH OF THE 9 POSES")
    print("=" * 65)
    
    individual_models = {}
    individual_metrics = {}

    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=12, restore_best_weights=True, verbose=0),
        tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5, verbose=0)
    ]

    for idx, pose in enumerate(CLASSES):
        print(f"\n[Pose {idx+1}/9] Training specialist model for: '{pose}'...")
        y_train_bin = (y_train == pose).astype(np.float32)
        y_test_bin = (y_test == pose).astype(np.float32)

        # Balanced class weights for 1-vs-rest binary problem
        cw = class_weight.compute_class_weight('balanced', classes=np.array([0.0, 1.0]), y=y_train_bin)
        cw_dict = {0: cw[0], 1: cw[1]}

        model = create_pose_specialist_model(pose)
        
        history = model.fit(
            X_train, y_train_bin,
            validation_data=(X_test, y_test_bin),
            epochs=50,
            batch_size=32,
            class_weight=cw_dict,
            callbacks=callbacks,
            verbose=0
        )

        # Evaluate on test set
        eval_res = model.evaluate(X_test, y_test_bin, verbose=0)
        test_loss = float(eval_res[0])
        test_acc = float(eval_res[1])
        test_prec = float(eval_res[2])
        test_rec = float(eval_res[3])
        f1 = float(2 * (test_prec * test_rec) / (test_prec + test_rec + 1e-8))

        print(f"  → Result for '{pose}': Acc: {test_acc*100:.1f}%, Precision: {test_prec:.3f}, Recall: {test_rec:.3f}, F1: {f1:.3f}, Loss: {test_loss:.4f}")

        # Save individual model checkpoint
        save_path = INDIVIDUAL_DIR / f"model_{pose}.keras"
        model.save(save_path)

        metrics_data = {
            "pose": pose,
            "accuracy": test_acc,
            "precision": test_prec,
            "recall": test_rec,
            "f1": f1,
            "loss": test_loss,
            "epochs_trained": len(history.history['loss'])
        }
        with open(INDIVIDUAL_DIR / f"{pose}_metrics.json", "w") as f:
            json.dump(metrics_data, f, indent=2)

        individual_models[pose] = model
        individual_metrics[pose] = metrics_data

    return individual_models, individual_metrics

# ── Model Aggregation ─────────────────────────────────────────────────────────
def aggregate_models(individual_models, X_train, y_train, X_test, y_test):
    print("\n" + "=" * 65)
    print(" STEP 3: AGGREGATING INDIVIDUAL MODELS INTO MASTER MULTICLASS MODEL")
    print("=" * 65)

    agg_model = create_aggregated_multiclass_model(num_classes=len(CLASSES))

    # 1. Feature Representation Aggregation:
    # Hidden layers: BatchNorm, Dense(256), Dense(128), Dense(64)
    hidden_layer_mappings = [
        ("batch_normalization", "bn"),
        ("dense_256", "dense256"),
        ("dense_128", "dense128"),
        ("dense_64", "dense64")
    ]

    for agg_name, prefix in hidden_layer_mappings:
        agg_layer = agg_model.get_layer(agg_name)
        weights_list = []
        for pose in CLASSES:
            spec_model = individual_models[pose]
            # Find matching layer in specialist model
            spec_layer = [l for l in spec_model.layers if prefix in l.name][0]
            weights_list.append(spec_layer.get_weights())

        # Average weights across all 9 individual models
        num_sub_weights = len(weights_list[0])
        averaged_weights = []
        for w_idx in range(num_sub_weights):
            avg_w = np.mean([w[w_idx] for w in weights_list], axis=0)
            averaged_weights.append(avg_w)
        
        agg_layer.set_weights(averaged_weights)
        print(f"  Aggregated layer '{agg_layer.name}' with weights averaged from 9 specialist models.")

    # 2. Output Layer Initialization:
    # The output layer is Dense(9, softmax). We initialize its kernel & bias from the 9 specialist output layers:
    out_kernels = []
    out_biases = []
    for pose in CLASSES:
        spec_model = individual_models[pose]
        out_layer = [l for l in spec_model.layers if "out_" in l.name][0]
        w, b = out_layer.get_weights()  # w: shape (64, 1), b: shape (1,)
        out_kernels.append(w[:, 0])
        out_biases.append(b[0])

    agg_out_layer = agg_model.get_layer("dense_output")
    agg_out_kernel = np.column_stack(out_kernels)  # shape: (64, 9)
    agg_out_bias = np.array(out_biases)            # shape: (9,)
    agg_out_layer.set_weights([agg_out_kernel, agg_out_bias])
    print(f"  Initialized output layer '{agg_out_layer.name}' (64 -> 9) from the 9 specialist heads.")

    # 3. Fine-Tuning / Joint Calibration:
    # Convert labels to indices
    class_to_idx = {cls: i for i, cls in enumerate(CLASSES)}
    y_train_idx = np.array([class_to_idx[c] for c in y_train])
    y_test_idx = np.array([class_to_idx[c] for c in y_test])

    cw = class_weight.compute_class_weight("balanced", classes=np.unique(y_train_idx), y=y_train_idx)
    cw_dict = dict(enumerate(cw))

    print("\nFine-tuning aggregated model on all 9 poses...")
    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True, verbose=1),
        tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=6, verbose=1)
    ]

    history = agg_model.fit(
        X_train, y_train_idx,
        validation_data=(X_test, y_test_idx),
        epochs=80,
        batch_size=32,
        class_weight=cw_dict,
        callbacks=callbacks,
        verbose=1
    )

    test_loss, test_acc = agg_model.evaluate(X_test, y_test_idx, verbose=0)
    print("\n" + "=" * 65)
    print(f" AGGREGATED MODEL TEST ACCURACY: {test_acc*100:.2f}%  |  LOSS: {test_loss:.4f}")
    print("=" * 65)

    y_pred_probs = agg_model.predict(X_test, verbose=0)
    y_pred_idx = np.argmax(y_pred_probs, axis=1)

    rep = classification_report(y_test_idx, y_pred_idx, target_names=CLASSES, digits=3)
    print("\nClassification Report across all 9 Poses:\n")
    print(rep)

    return agg_model, test_acc, test_loss, rep

# ── Integration into Existing System ───────────────────────────────────────────
def export_and_integrate(model, test_acc, test_loss, rep):
    print("\n" + "=" * 65)
    print(" STEP 4: INTEGRATING AGGREGATED MODEL INTO EXISTING SYSTEM")
    print("=" * 65)

    # Save Keras format
    keras_path = TRAINED_DIR / "aggregated_yoga_model.keras"
    model.save(keras_path)
    print(f"  Saved master model checkpoint: {keras_path}")

    # Build plain JSON export matching mlClassifier.ts forward pass exactly
    inference_layers = [l for l in model.layers if l.__class__.__name__ not in ('Dropout', 'InputLayer')]
    layers_export = []

    for layer in inference_layers:
        w = layer.get_weights()
        cls_name = layer.__class__.__name__
        if cls_name == "BatchNormalization":
            layers_export.append({
                "type": "batchnorm",
                "gamma": w[0].tolist(),
                "beta": w[1].tolist(),
                "mean": w[2].tolist(),
                "variance": w[3].tolist(),
                "epsilon": float(layer.epsilon)
            })
        elif cls_name == "Dense":
            activation = layer.get_config()["activation"]
            layers_export.append({
                "type": "dense",
                "activation": activation,
                "kernel": w[0].tolist(),  # shape [in, out]
                "bias": w[1].tolist()     # shape [out]
            })

    weights_json = {
        "inputDim": int(INPUT_DIM),
        "outputDim": int(len(CLASSES)),
        "classes": CLASSES,
        "layers": layers_export,
    }

    pose_classes_json = {
        "classes": CLASSES,
        "inputDim": int(INPUT_DIM)
    }

    # 1. Update frontend public directory (live browser client)
    frontend_weights = FRONTEND_OUT / "weights.json"
    frontend_classes = FRONTEND_OUT / "pose_classes.json"
    with open(frontend_weights, "w") as f:
        json.dump(weights_json, f)
    with open(frontend_classes, "w") as f:
        json.dump(pose_classes_json, f, indent=2)
    print(f"  Updated Frontend Model: {frontend_weights} ({frontend_weights.stat().st_size:,} bytes)")
    print(f"  Updated Frontend Classes: {frontend_classes}")

    # 2. Update ml_training directory artifacts
    ml_weights = TRAINED_DIR / "weights.json"
    ml_classes = TRAINED_DIR / "pose_classes.json"
    with open(ml_weights, "w") as f:
        json.dump(weights_json, f)
    with open(ml_classes, "w") as f:
        json.dump(pose_classes_json, f, indent=2)
    print(f"  Updated ML Trained Model: {ml_weights}")

    # 3. Write summary report
    summary_path = ML_DIR / "training_summary.json"
    summary_data = {
        "model_name": "Aggregated Yoga 9-Pose Classifier",
        "num_classes": len(CLASSES),
        "classes": CLASSES,
        "test_accuracy": float(test_acc),
        "test_loss": float(test_loss),
        "classification_report": rep,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    with open(summary_path, "w") as f:
        json.dump(summary_data, f, indent=2)
    print(f"  Wrote Summary Report: {summary_path}")

    print("\nIntegration Complete! Model is ready for browser & backend inference without conflicts.")

if __name__ == "__main__":
    X_train, y_train, X_test, y_test = build_full_dataset()
    ind_models, ind_metrics = train_individual_models(X_train, y_train, X_test, y_test)
    agg_model, test_acc, test_loss, rep = aggregate_models(ind_models, X_train, y_train, X_test, y_test)
    export_and_integrate(agg_model, test_acc, test_loss, rep)
