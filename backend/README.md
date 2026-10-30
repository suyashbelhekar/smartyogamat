# ⚡ SmartYoga AI — Backend & IoT Architecture

SmartYoga AI utilizes an **Edge-Computing & Serverless Real-Time Telemetry** architecture designed for ultra-low latency (<30ms), zero cloud bandwidth costs for video streaming, and end-to-end user privacy.

---

## 🏛 Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │          SmartYoga AI Web Client      │
                      │  (React 19 + MediaPipe Tasks + TF.js) │
                      └──────────────┬───────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
  ┌──────────────────────────────┐       ┌──────────────────────────────┐
  │   Client-Side Edge Vision    │       │  Firebase Realtime Database  │
  │ • MediaPipe 33 Landmarks     │       │ • IoT Sensor Matrix Telemetry│
  │ • 5s Initial Posture Scan    │       │ • Session History & Reports  │
  │ • Real-time Joint Geometry   │       └──────────────▲───────────────┘
  └──────────────────────────────┘                      │
                                                        │ WiFi / MQTT / REST
                                         ┌──────────────┴───────────────┐
                                         │   Smart Yoga Mat (ESP32)     │
                                         │ • 6-Channel Pressure Matrix  │
                                         │ • Left/Right Weight Ratio    │
                                         └──────────────────────────────┘
```

---

## 📡 1. IoT Sensor Mat Telemetry (ESP32 Matrix)

The smart yoga mat hardware consists of piezoresistive pressure sensors connected to an ESP32 microcontroller reading analog values across 6 key pressure points:

| Sensor ID | Location | Biomechanical Measurement |
| :--- | :--- | :--- |
| `p1` | Left Heel | Posterior left heel strike and grounding |
| `p2` | Left Metatarsal | Anterior left foot arch & ball pressure |
| `p3` | Left Outer Edge | Lateral left foot inversion/eversion balance |
| `p4` | Right Heel | Posterior right heel strike and grounding |
| `p5` | Right Metatarsal | Anterior right foot arch & ball pressure |
| `p6` | Right Outer Edge | Lateral right foot inversion/eversion balance |

### JSON Payload Schema (`/sensors/mat`)
```json
{
  "timestamp": 1729482910234,
  "sensors": {
    "p1": 420,
    "p2": 510,
    "p3": 130,
    "p4": 415,
    "p5": 525,
    "p6": 140
  },
  "balance": {
    "weightLeft": 51.2,
    "weightRight": 48.8,
    "balanceScore": 88
  }
}
```

---

## 💾 2. Cloud Session Persistence (`/sessions/<sessionId>`)

Session records and progress reports are saved locally and synced to Firebase Realtime Database:

```json
{
  "id": "session_1730300400000",
  "poseId": "warrior2",
  "timestamp": 1730300400000,
  "durationSec": 45,
  "accuracy": 88,
  "instantBalanceScore": 84,
  "correctionsPerformed": 3,
  "improvementPct": 14,
  "topFaults": [
    "Bend front knee toward 90° (±18° deviation)",
    "Straighten rear leg fully"
  ],
  "accuracyHistory": [64, 70, 78, 85, 88]
}
```

---

## 🔐 3. Firebase Security Rules (`database.rules.json`)

To secure the Realtime Database for production deployments:

```json
{
  "rules": {
    "sensors": {
      "mat": {
        ".read": true,
        ".write": "auth != null || request.auth.token.role == 'iot_device'"
      }
    },
    "sessions": {
      "$sessionId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

---

## 🚀 4. Optional: Dedicated Microservices API

If you wish to deploy an additional Python (FastAPI) or Node.js backend for offline batch processing, user authentication, or LMS integration:

### Example FastAPI Proxy (`backend/main.py`)
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SmartYoga AI Backend Service")

class TelemetryPayload(BaseModel):
    userId: str
    sessionId: str
    averageAccuracy: float
    correctionsCount: int

@app.post("/api/v1/sessions/record")
async def record_session(payload: TelemetryPayload):
    # Process or forward to PostgreSQL / MongoDB
    return {"status": "recorded", "sessionId": payload.sessionId}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

