import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── In-Memory Datastore ─────────────────────────────────────────────────────

// 1. Live Smart Mat State (6-channel FSR matrix)
let matState = {
  timestamp: Date.now(),
  connected: true,
  deviceId: 'ESP32_SMART_MAT_01',
  sensors: {
    p1: 340, // Left Heel
    p2: 410, // Left Metatarsal
    p3: 120, // Left Outer Edge
    p4: 335, // Right Heel
    p5: 415, // Right Metatarsal
    p6: 125  // Right Outer Edge
  },
  balance: {
    weightLeft: 50.0,
    weightRight: 50.0,
    balanceScore: 88,
    stabilityRating: 'Optimal',
    swayIndex: 8.5
  }
}

// 2. 9 Classical Asana Biomechanical Registry
const ASANAS = [
  {
    id: 'downdog',
    name: 'Downward-Facing Dog',
    sanskrit: 'Adho Mukha Svanasana',
    group: 'floor',
    difficulty: 'Beginner',
    targetAngles: { leftElbow: 175, rightElbow: 175, leftHip: 70, leftKnee: 175 },
    description: 'Inverted V-shape stretch strengthening shoulders, hamstrings, and calves.'
  },
  {
    id: 'goddess',
    name: 'Goddess Pose',
    sanskrit: 'Utkata Konasana',
    group: 'standing',
    difficulty: 'Intermediate',
    targetAngles: { leftKnee: 95, rightKnee: 95, leftElbow: 90, torsoTilt: 0 },
    description: 'Wide-legged squat opening hips and groin while strengthening quads.'
  },
  {
    id: 'plank',
    name: 'Plank Pose',
    sanskrit: 'Phalakasana',
    group: 'floor',
    difficulty: 'Beginner',
    targetAngles: { leftHip: 175, leftKnee: 175, leftElbow: 175 },
    description: 'Full-body core stability hold aligning crown to heels.'
  },
  {
    id: 'tree',
    name: 'Tree Pose',
    sanskrit: 'Vrksasana',
    group: 'standing',
    difficulty: 'Beginner',
    targetAngles: { standingKnee: 175, liftedKnee: 45, torsoTilt: 0 },
    description: 'Unilateral standing balance cultivating mental poise and ankle stability.'
  },
  {
    id: 'warrior2',
    name: 'Warrior II',
    sanskrit: 'Virabhadrasana II',
    group: 'standing',
    difficulty: 'Intermediate',
    targetAngles: { frontKnee: 92, backKnee: 175, armsElevation: 90 },
    description: 'Dynamic lunge opening hips with arms parallel to the floor.'
  },
  {
    id: 'ardhamatsyendrasana',
    name: 'Half Spinal Twist',
    sanskrit: 'Ardha Matsyendrasana',
    group: 'sitting',
    difficulty: 'Intermediate',
    targetAngles: { crossedKnee: 55, torsoTilt: 0, twistArm: 95 },
    description: 'Seated spinal rotation detoxifying abdominal organs and improving spine mobility.'
  },
  {
    id: 'baddhakonasana',
    name: 'Bound Angle (Butterfly)',
    sanskrit: 'Baddha Konasana',
    group: 'sitting',
    difficulty: 'Beginner',
    targetAngles: { leftKnee: 40, rightKnee: 40, torsoTilt: 0 },
    description: 'Seated restorative posture opening adductors, hips, and lower back.'
  },
  {
    id: 'dandasana',
    name: 'Staff Pose',
    sanskrit: 'Dandasana',
    group: 'sitting',
    difficulty: 'Beginner',
    targetAngles: { leftKnee: 175, rightKnee: 175, leftHip: 90, torsoTilt: 0 },
    description: 'Foundational seated 90-degree posture establishing erect spinal alignment.'
  },
  {
    id: 'padmasana',
    name: 'Lotus Pose',
    sanskrit: 'Padmasana',
    group: 'sitting',
    difficulty: 'Advanced',
    targetAngles: { leftKnee: 35, rightKnee: 35, torsoTilt: 0 },
    description: 'Cross-legged meditative posture calming the nervous system and centering breath.'
  }
]

// 3. Historical Session Log
let sessionStore = [
  {
    id: 'session_demo_01',
    poseId: 'warrior2',
    poseName: 'Warrior II',
    poseSanskrit: 'Virabhadrasana II',
    timestamp: Date.now() - 3600000 * 24,
    durationSec: 65,
    cameraAccuracy: 92,
    matBalanceScore: 89,
    combinedScore: 91,
    correctionsPerformed: 3,
    improvementPct: 14,
    topFaults: [
      { id: 'frontKnee', jointNameEn: 'Front Knee', avgDeviationDeg: 12, sampleCueEn: 'Bend front knee deeper toward 90°' }
    ]
  }
]

// ── Utility: Recalculate Balance Metrics ────────────────────────────────────
function calculateBalance(sensors) {
  const leftTotal = (sensors.p1 || 0) + (sensors.p2 || 0) + (sensors.p3 || 0)
  const rightTotal = (sensors.p4 || 0) + (sensors.p5 || 0) + (sensors.p6 || 0)
  const grandTotal = leftTotal + rightTotal

  if (grandTotal < 50) {
    return {
      weightLeft: 50.0,
      weightRight: 50.0,
      balanceScore: 70,
      stabilityRating: 'Unweighted (Step on Mat)',
      swayIndex: 0
    }
  }

  const weightLeft = Math.round((leftTotal / grandTotal) * 1000) / 10
  const weightRight = Math.round((rightTotal / grandTotal) * 1000) / 10
  const diff = Math.abs(weightLeft - 50.0)
  const balanceScore = Math.max(0, Math.round(100 - diff * 2.5))

  const stabilityRating =
    balanceScore >= 85 ? 'Optimal' : balanceScore >= 70 ? 'Moderate' : 'Imbalanced'

  return {
    weightLeft,
    weightRight,
    balanceScore,
    stabilityRating,
    swayIndex: Math.round(diff * 10) / 10
  }
}

// ── Routes: Health & Root ───────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    service: 'SmartYoga AI Backend Service',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      matStatus: '/api/mat/status',
      matTelemetry: 'POST /api/mat/telemetry',
      sessions: '/api/sessions',
      analytics: '/api/analytics/summary',
      poses: '/api/poses'
    }
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
  })
})

// ── Routes: Smart Mat IoT Telemetry ─────────────────────────────────────────

// Current live pressure readings
app.get('/api/mat/status', (req, res) => {
  res.json({
    success: true,
    data: matState
  })
})

// Ingest telemetric sensor packet from ESP32 microcontroller
app.post('/api/mat/telemetry', (req, res) => {
  const { sensors, deviceId } = req.body

  if (!sensors || typeof sensors !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Invalid payload: "sensors" object with p1..p6 readings required'
    })
  }

  const cleanSensors = {
    p1: Number(sensors.p1) || 0,
    p2: Number(sensors.p2) || 0,
    p3: Number(sensors.p3) || 0,
    p4: Number(sensors.p4) || 0,
    p5: Number(sensors.p5) || 0,
    p6: Number(sensors.p6) || 0
  }

  const balance = calculateBalance(cleanSensors)

  matState = {
    timestamp: Date.now(),
    connected: true,
    deviceId: deviceId || matState.deviceId,
    sensors: cleanSensors,
    balance
  }

  res.json({
    success: true,
    message: 'Telemetry received',
    balance: matState.balance
  })
})

// Simulate smart mat telemetry for testing without physical ESP32
app.post('/api/mat/simulate', (req, res) => {
  const { pattern = 'balanced' } = req.body

  let sensors = { p1: 350, p2: 420, p3: 130, p4: 350, p5: 420, p6: 130 }
  if (pattern === 'left_heavy') {
    sensors = { p1: 620, p2: 710, p3: 250, p4: 210, p5: 240, p6: 70 }
  } else if (pattern === 'right_heavy') {
    sensors = { p1: 190, p2: 230, p3: 65, p4: 680, p5: 740, p6: 280 }
  } else if (pattern === 'jitter') {
    const jitter = () => Math.round(300 + Math.random() * 200)
    sensors = { p1: jitter(), p2: jitter(), p3: jitter() / 3, p4: jitter(), p5: jitter(), p6: jitter() / 3 }
  }

  matState = {
    timestamp: Date.now(),
    connected: true,
    deviceId: 'SIMULATOR_TEST',
    sensors,
    balance: calculateBalance(sensors)
  }

  res.json({
    success: true,
    mode: pattern,
    data: matState
  })
})

// Calibrate or zero the mat
app.post('/api/mat/reset', (req, res) => {
  matState = {
    timestamp: Date.now(),
    connected: true,
    deviceId: matState.deviceId,
    sensors: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
    balance: {
      weightLeft: 50.0,
      weightRight: 50.0,
      balanceScore: 100,
      stabilityRating: 'Zeroed / Calibrated',
      swayIndex: 0
    }
  }
  res.json({ success: true, message: 'Mat successfully calibrated to zero' })
})

// ── Routes: Yoga Practice Sessions ──────────────────────────────────────────

// List recorded sessions
app.get('/api/sessions', (req, res) => {
  const { poseId, limit = 50 } = req.query
  let list = [...sessionStore]

  if (poseId) {
    list = list.filter((s) => s.poseId === poseId)
  }

  list.sort((a, b) => b.timestamp - a.timestamp)
  res.json({
    success: true,
    count: list.length,
    sessions: list.slice(0, Number(limit))
  })
})

// Save new session summary
app.post('/api/sessions', (req, res) => {
  const session = req.body

  if (!session || !session.poseId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required session fields (poseId, cameraAccuracy, durationSec)'
    })
  }

  const record = {
    id: session.id || `session_${Date.now()}`,
    poseId: session.poseId,
    poseName: session.poseName || session.poseId,
    poseSanskrit: session.poseSanskrit || '',
    timestamp: session.timestamp || Date.now(),
    durationSec: Number(session.durationSec) || 0,
    cameraAccuracy: Number(session.cameraAccuracy) || 0,
    matBalanceScore: Number(session.matBalanceScore) || 0,
    combinedScore: Number(session.combinedScore) || 0,
    matchedTimeSec: Number(session.matchedTimeSec) || 0,
    bestStreakSec: Number(session.bestStreakSec) || 0,
    correctionsPerformed: Number(session.correctionsPerformed) || 0,
    improvementPct: Number(session.improvementPct) || 0,
    accuracyHistory: Array.isArray(session.accuracyHistory) ? session.accuracyHistory : [],
    topFaults: Array.isArray(session.topFaults) ? session.topFaults : [],
    suggestions: Array.isArray(session.suggestions) ? session.suggestions : [],
    balanceMetrics: session.balanceMetrics || null
  }

  // Deduplicate by ID
  sessionStore = [record, ...sessionStore.filter((s) => s.id !== record.id)]

  res.status(201).json({
    success: true,
    message: 'Session recorded successfully',
    session: record
  })
})

// Retrieve single session
app.get('/api/sessions/:id', (req, res) => {
  const item = sessionStore.find((s) => s.id === req.params.id)
  if (!item) {
    return res.status(404).json({ success: false, error: 'Session not found' })
  }
  res.json({ success: true, session: item })
})

// Delete session
app.delete('/api/sessions/:id', (req, res) => {
  const before = sessionStore.length
  sessionStore = sessionStore.filter((s) => s.id !== req.params.id)
  if (sessionStore.length === before) {
    return res.status(404).json({ success: false, error: 'Session not found' })
  }
  res.json({ success: true, message: 'Session deleted' })
})

// Longitudinal Analytics Summary
app.get('/api/analytics/summary', (req, res) => {
  const totalSessions = sessionStore.length
  const totalPracticeSec = sessionStore.reduce((acc, s) => acc + (s.durationSec || 0), 0)
  const avgAccuracy = totalSessions > 0
    ? Math.round(sessionStore.reduce((acc, s) => acc + (s.cameraAccuracy || 0), 0) / totalSessions)
    : 0
  const avgMatBalance = totalSessions > 0
    ? Math.round(sessionStore.reduce((acc, s) => acc + (s.matBalanceScore || 0), 0) / totalSessions)
    : 0

  res.json({
    success: true,
    data: {
      totalSessions,
      totalPracticeMinutes: Math.round(totalPracticeSec / 60),
      overallAverageAccuracy: avgAccuracy,
      overallAverageMatBalance: avgMatBalance,
      recordedPosesCount: new Set(sessionStore.map((s) => s.poseId)).size,
      latestSession: sessionStore[0] || null
    }
  })
})

// ── Routes: Pose Curriculum Registry ────────────────────────────────────────

app.get('/api/poses', (req, res) => {
  res.json({
    success: true,
    count: ASANAS.length,
    poses: ASANAS
  })
})

app.get('/api/poses/:id', (req, res) => {
  const pose = ASANAS.find((p) => p.id === req.params.id)
  if (!pose) {
    return res.status(404).json({ success: false, error: 'Asana not found in classical curriculum' })
  }
  res.json({ success: true, pose })
})

// ── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SmartYoga AI Backend running on port ${PORT}`)
  console.log(`Health check ready at http://localhost:${PORT}/health`)
})
