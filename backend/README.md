# ⚡ SmartYoga AI — Backend API & IoT Telemetry Service

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

A high-performance, lightweight microservice built with **Node.js & Express** providing real-time IoT smart mat telemetry ingestion, yoga posture session journaling, longitudinal analytics, and the 9-asana classical biomechanical registry for **SmartYoga AI**.

---

## 🏛 Architecture

```text
  ┌────────────────────────────────────────────────────────┐
  │                 SmartYoga AI Frontend                  │
  │            (React 19, MediaPipe, TF.js)                │
  │          Hosted on Vercel (smartyogamat)               │
  └──────────────────────────┬─────────────────────────────┘
                             │ REST / JSON
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │              SmartYoga AI Backend Service              │
  │          (Express.js API Hosted on Render)             │
  │             (smartyoga-backend repository)             │
  └──────────────┬───────────────────────────▲─────────────┘
                 │                           │ HTTP POST Telemetry
                 ▼                           │ (/api/mat/telemetry)
  ┌──────────────────────────────┐ ┌─────────┴─────────────┐
  │   Session Log & Analytics    │ │   ESP32 Smart Mat     │
  │   • In-memory / DB records   │ │   • 6 FSR Channels    │
  │   • Longitudinal Trends      │ │   • Dual-Foot Matrix  │
  └──────────────────────────────┘ └───────────────────────┘
```

---

## 🚀 1-Click Deployment on Render

This repository includes a pre-configured [`render.yaml`](./render.yaml):

1. Go to [dashboard.render.com](https://dashboard.render.com) and sign in.
2. Click **"New +"** → **"Web Service"** (or choose **"Blueprint"**).
3. Connect your GitHub repository: `https://github.com/suyashbelhekar/smartyoga-backend`.
4. Render will automatically detect the settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
5. Click **Create Web Service**. Your API will be live at `https://smartyoga-backend.onrender.com`!

---

## 📡 API Endpoints

### 1. Health & Status
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Service root & API index |
| `GET` | `/health` | Service health status, uptime, memory usage |

**Sample `/health` response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-31T00:38:00.000Z",
  "uptimeSeconds": 1420,
  "memoryUsageMB": 38
}
```

---

### 2. Smart Mat IoT Telemetry
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mat/status` | Current pressure matrix & symmetry load |
| `POST` | `/api/mat/telemetry` | Ingest 6-channel sensor packet from ESP32 |
| `POST` | `/api/mat/simulate` | Test mat with simulated weight (`balanced`, `left_heavy`, `right_heavy`) |
| `POST` | `/api/mat/reset` | Zero/calibrate mat readings |

**Sample ESP32 Telemetry Payload (`POST /api/mat/telemetry`):**
```json
{
  "deviceId": "ESP32_SMART_MAT_01",
  "sensors": {
    "p1": 340,
    "p2": 410,
    "p3": 120,
    "p4": 335,
    "p5": 415,
    "p6": 125
  }
}
```

---

### 3. Yoga Practice Sessions & Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/sessions` | List recorded sessions (supports `?poseId=` filter) |
| `POST` | `/api/sessions` | Record a completed yoga practice session |
| `GET` | `/api/sessions/:id` | Fetch single session details |
| `DELETE` | `/api/sessions/:id` | Delete session record |
| `GET` | `/api/analytics/summary`| Longitudinal statistics, total minutes, streak |

**Sample Session Record (`POST /api/sessions`):**
```json
{
  "poseId": "warrior2",
  "poseName": "Warrior II",
  "poseSanskrit": "Virabhadrasana II",
  "durationSec": 45,
  "cameraAccuracy": 91,
  "matBalanceScore": 88,
  "combinedScore": 90,
  "correctionsPerformed": 2,
  "improvementPct": 12
}
```

---

### 4. Asana Curriculum Registry
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/poses` | Retrieve all 9 classical asanas with metadata |
| `GET` | `/api/poses/:id` | Retrieve biomechanical angle specifications |

---

## 🛠 Local Development

```bash
# Clone the repository
git clone https://github.com/suyashbelhekar/smartyoga-backend.git
cd smartyoga-backend

# Install dependencies
npm install

# Start local dev server (auto-reloads on file change)
npm run dev
```

Server runs on: **`http://localhost:5000`**

---

## 📜 License
MIT License. © 2026 SmartYoga AI.
