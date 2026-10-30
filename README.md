# 🧘 SmartYoga AI — Real-Time AI Yoga Posture Correction & Smart Mat Studio

> **Edge Computer Vision • Biomechanical Joint Alignment • 5s Calibration • IoT Mat Telemetry • Dual-Language Audio Coach**

SmartYoga AI is a full-stack, edge-computing wellness platform that combines real-time computer vision skeleton tracking, mathematical joint angle analysis, and IoT pressure mat telemetry to provide live, interactive yoga posture correction without video streaming latency.

---

## 📁 Repository Structure

```text
pose/
├── 🌐 frontend/                  # Modern Web Application (React 19, TypeScript, Vite, Tailwind)
│   ├── src/                      # App source code
│   │   ├── components/           # UI Views (Cockpit, Pose Library, Pressure, Progress, Home)
│   │   ├── hooks/                # Custom React hooks (usePoseClassifier, useSessionTracker)
│   │   ├── lib/                  # Posture engine, joint geometry, balance analyzer, voice coach
│   │   ├── services/             # MediaPipe PoseDetector, Camera capture, History & Firebase
│   │   ├── types/                # Session, Landmark, and Posture type definitions
│   │   └── App.tsx               # Main Studio application container
│   ├── public/                   # Static assets, TF.js weights, MediaPipe models, pose photos
│   ├── package.json              # Frontend dependencies and build scripts
│   └── vite.config.ts            # Vite bundler configuration
│
├── ⚡ backend/                   # Backend & IoT Telemetry Architecture
│   └── README.md                 # Firebase Realtime DB schema, ESP32 IoT mat payload, security rules
│
├── 🧠 ml_training/               # AI / Machine Learning Pipeline
│   ├── train_tfjs.py             # MediaPipe keypoint extractor & TF.js model trainer
│   ├── train_dataset2.py         # Secondary dataset training & weights generator
│   ├── pose_landmarker.task      # MediaPipe Tasks Vision model bundle
│   └── trained_model/            # Exported TF.js model artifacts
│
├── 📊 dataset/                   # Asana Dataset
│   ├── DATASET/
│   │   ├── TRAIN/                # Training samples (downdog, goddess, plank, tree, warrior2)
│   │   └── TEST/                 # Evaluation samples (downdog, goddess, plank, tree, warrior2)
│   └── dataset.zip               # Complete dataset compressed archive
│
├── 📱 android/                   # Native Android Application (ML Kit Vision Quickstart)
│   ├── app/                      # Android application module (Kotlin/Java)
│   ├── gradle/                   # Gradle wrapper distribution
│   ├── images/                   # Android app screenshots
│   ├── build.gradle              # Root Gradle configuration
│   └── gradlew / gradlew.bat     # Gradle wrapper executables
│
├── 🎨 DESIGN.md                  # Raycast Dark Glass Design System Specifications
├── 📦 package.json               # Root convenience scripts (npm run dev, npm run build)
└── 📖 README.md                  # Project documentation & architectural guide
```

---

## ✨ Core Features

### 1. 5-Second Initial Posture Scan & Calibration
- When a practitioner steps into frame or switches target asanas, an on-screen circular SVG countdown timer runs from **5 down to 1 second**.
- Scoring and match declarations are suppressed during this scan phase, allowing the user to settle while the computer vision system locks onto the skeletal landmarks.
- The skeleton canvas pulses in electric cyan (`#38bdf8`) during calibration.

### 2. Real-Time Mathematical Joint Angle Engine
- Direct vector geometry calculates exact 2D joint angles across:
  - Elbow flexion & extension
  - Shoulder abduction & elevation
  - Hip angles & vertical torso tilt
  - Knee alignment & asymmetric limb distinction
- **Dynamic Asymmetry Detection**:
  - **Tree Pose (*Vrksasana*)**: Dynamically detects standing leg vs. lifted leg based on foot height and knee angle.
  - **Warrior II (*Virabhadrasana II*)**: Automatically determines front bent leg (~90°) vs. rear extended leg (~180°), accommodating both left- and right-facing practice.

### 3. Dynamic Posture Correction & Visual Feedback
- **Directional Instructions**: Real-time actionable cues with exact angular deviations (e.g. `Straighten left knee (±24° deviation)` / `Align arms horizontal`).
- **Dual-Language Guidance**: All feedback is synthesized in English and मराठी (`डावा गुडघा सरळ करा`).
- **Canvas Highlighting**: Misaligned joints and limbs glow in coral-red (`#f43f5e`) with real-time angle readouts.
- **Dynamic Scoring**: The accuracy score updates continuously with each posture adjustment; improvements are reflected immediately (`▲ +12%` / `▼ -6%`).

### 4. IoT Smart Mat Integration (ESP32)
- Reads a 6-point piezoresistive pressure matrix (Left/Right Heel, Metatarsal, and Outer Edges).
- Real-time bilateral balance ratio and center-of-gravity sway analysis.
- Telemetry synchronized via Firebase Realtime Database at `/sensors/mat`.

### 5. Curriculum of 9 Classical Asanas
Trained and calibrated with 96.6% accuracy on 33-point normalized 3D skeleton vectors:
1. **Downward-Facing Dog** (*Adho Mukha Svanasana*) — Floor
2. **Goddess Pose** (*Utkata Konasana*) — Standing
3. **Plank Pose** (*Phalakasana*) — Floor
4. **Tree Pose** (*Vrksasana*) — Standing
5. **Warrior II** (*Virabhadrasana II*) — Standing
6. **Half Spinal Twist** (*Ardha Matsyendrasana*) — Seated
7. **Bound Angle / Butterfly** (*Baddha Konasana*) — Seated
8. **Staff Pose** (*Dandasana*) — Seated
9. **Lotus Pose** (*Padmasana*) — Seated

---

## 🌐 Dual-Repository Architecture & Cloud Deployment

SmartYoga AI is organized into two dedicated repositories:

| Component | GitHub Repository | Primary Hosting Platform |
| :--- | :--- | :--- |
| **Frontend Web Studio** | [`suyashbelhekar/smartyogamat`](https://github.com/suyashbelhekar/smartyogamat) | **Vercel** |
| **Backend API & IoT Telemetry** | [`suyashbelhekar/smartyoga-backend`](https://github.com/suyashbelhekar/smartyoga-backend) | **Render** |

---

## 🚀 Cloud Deployment Guide

### 1. Deploy Frontend on Vercel
This repository includes a pre-configured [`vercel.json`](file:///d:/pose%20(2)/pose/vercel.json):
1. Import your GitHub repository **`suyashbelhekar/smartyogamat`** into [Vercel](https://vercel.com).
2. Vercel automatically detects `vercel.json` with settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm --prefix frontend install && npm --prefix frontend run build`
   - **Output Directory**: `frontend/dist`
3. In Project Settings -> Environment Variables, optionally add:
   - `VITE_BACKEND_URL`: `https://smartyoga-backend.onrender.com`
4. Click **Deploy**!

### 2. Deploy Backend on Render
The backend repository is ready to deploy at [**`suyashbelhekar/smartyoga-backend`**](https://github.com/suyashbelhekar/smartyoga-backend):
1. In [Render Dashboard](https://dashboard.render.com), click **"New +"** -> **"Web Service"**.
2. Connect `https://github.com/suyashbelhekar/smartyoga-backend`.
3. Render automatically reads `render.yaml` (`npm install` & `npm start`, health check at `/health`).
4. Click **Create Web Service**! Your backend will be live at `https://smartyoga-backend.onrender.com`.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (for model training, optional)
- Modern browser with webcam support (Chrome, Edge, Brave, Firefox)

### 1. Web Studio (Frontend)
Run directly from the root directory:
```bash
# Install dependencies
npm --prefix frontend install

# Start Vite development server
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

To create a production build:
```bash
npm run build
```

---

### 2. Machine Learning Pipeline (`ml_training/`)
To retrain or re-export the TensorFlow.js pose classifier:
```bash
# Navigate to ML directory
cd ml_training

# Install Python requirements
pip install mediapipe tensorflow numpy

# Run extraction and training
python train_tfjs.py
```
Model weights are exported directly into `frontend/public/pose_model/`.

---

### 3. Native Android App (`android/`)
To build the Android application:
```bash
cd android
./gradlew assembleDebug
```
Or open the `android/` directory in Android Studio and deploy to a connected device.

---

## 🎨 UI / UX Design System

SmartYoga AI follows the **Raycast Dark Glass Design System**:
- **Void Black Canvas**: `#040506`
- **Elevated Ink Cards**: `#07080a` with hairline borders (`#363739`)
- **Brand Accent**: Coral Neon (`#ff6363`)
- **Calibrating Cyan**: `#38bdf8`
- **Success Mint**: `#34d399`
- Detailed specifications, color tokens, and layout guidelines are defined in [DESIGN.md](file:///d:/pose%20(2)/pose/DESIGN.md).

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.
