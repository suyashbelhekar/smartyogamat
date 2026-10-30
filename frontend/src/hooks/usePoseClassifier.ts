import { voiceCoach } from '../lib/voiceCoach'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CoachResult } from '../lib/coachCues'
import type { Landmark } from '../lib/drawPose'
import { emptyScores, POSE_CLASSES, type PoseClassId } from '../lib/landmarks'
import { MlPoseClassifier } from '../lib/mlClassifier'
import {
  evaluatePoseAlignment,
  PostureCorrectionTracker,
  type LivePostureProgress,
  type PostureEvaluationResult,
} from '../lib/postureEngine'
import { cameraIssueFromError, startCamera, stopCamera } from '../services/camera'
import { PoseDetector } from '../services/poseDetector'

export type AppIssue =
  | 'loading'
  | 'requesting-camera'
  | 'camera-denied'
  | 'camera-missing'
  | 'camera-in-use'
  | 'camera-error'
  | 'no-person'
  | 'tracking'

export type PoseScores = Record<PoseClassId, number>

const SMOOTH = 0.30

const EMPTY_COACH: CoachResult = {
  cues: [],
  cuesMr: [],
  detailedCues: [],
  status: 'off',
  score: 0,
  matched: false,
  isSettling: false,
  settlingRemainingSec: 0,
}

export type FrozenState = {
  isFrozen: boolean
  score: number
  declaredPercentage: number
  poseId: PoseClassId | null
  declaredAt: number
}

const INITIAL_FROZEN: FrozenState = {
  isFrozen: false,
  score: 0,
  declaredPercentage: 0,
  poseId: null,
  declaredAt: 0,
}

const COUNTDOWN_DURATION_MS = 5000 // Exactly 5 seconds initial posture analysis

const INITIAL_LIVE_PROGRESS: LivePostureProgress = {
  accuracy: 0,
  recentAccuracy: 0,
  initialAccuracy: 0,
  improvementPct: 0,
  activeMistakes: [],
  correctionsCount: 0,
  correctionsHistory: [],
  accuracyHistory: [],
  topFaultsSummary: [],
}

export function usePoseClassifier(targetId: PoseClassId | null) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const detectorRef = useRef<PoseDetector | null>(null)
  const classifierRef = useRef<MlPoseClassifier | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scoresRef = useRef<PoseScores>(emptyScores())
  const targetRef = useRef(targetId)
  targetRef.current = targetId
  const prevTargetRef = useRef(targetId)
  const rafRef = useRef(0)

  const countdownStartRef = useRef(0)
  const wasPersonDetectedRef = useRef(false)
  const postureTrackerRef = useRef(new PostureCorrectionTracker())
  const recentScoreEmaRef = useRef<number>(0)

  const [issue, setIssue] = useState<AppIssue>('loading')
  const [running, setRunning] = useState(false)
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null)
  const [label, setLabel] = useState<PoseClassId | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [scores, setScores] = useState<PoseScores>(emptyScores)
  const [guidance, setGuidance] = useState<CoachResult>(EMPTY_COACH)

  // 5-second countdown state
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdownRemainingSec, setCountdownRemainingSec] = useState(0)
  const [countdownProgress, setCountdownProgress] = useState(0)

  // Posture Evaluation & Live Analytics
  const [postureEvaluation, setPostureEvaluation] = useState<PostureEvaluationResult | null>(null)
  const [liveProgress, setLiveProgress] = useState<LivePostureProgress>(INITIAL_LIVE_PROGRESS)

  // FrozenState shim for backward-compat with components
  const [frozenState, setFrozenState] = useState<FrozenState>(INITIAL_FROZEN)

  const unfreeze = useCallback(() => {
    setFrozenState(INITIAL_FROZEN)
  }, [])

  const freeze = useCallback(() => {
    setFrozenState(INITIAL_FROZEN)
  }, [])

  const stop = useCallback(() => {
    voiceCoach.stopSession()
    cancelAnimationFrame(rafRef.current)
    stopCamera(streamRef.current, videoRef.current)
    streamRef.current = null
    detectorRef.current?.close()
    detectorRef.current = null
    classifierRef.current?.dispose()
    classifierRef.current = null
    scoresRef.current = emptyScores()
    countdownStartRef.current = 0
    wasPersonDetectedRef.current = false
    recentScoreEmaRef.current = 0
    postureTrackerRef.current.reset()

    setRunning(false)
    setLandmarks(null)
    setLabel(null)
    setConfidence(0)
    setScores(emptyScores())
    setGuidance(EMPTY_COACH)
    setCountdownActive(false)
    setCountdownRemainingSec(0)
    setCountdownProgress(0)
    setPostureEvaluation(null)
    setLiveProgress(INITIAL_LIVE_PROGRESS)
  }, [])

  const start = useCallback(async () => {
    stop()
    setIssue('loading')

    try {
      const clf = new MlPoseClassifier()
      const det = new PoseDetector()
      classifierRef.current = clf
      detectorRef.current = det
      await Promise.all([clf.load(), det.init()])
      if (clf.error) throw new Error(`Model load failed: ${clf.error}`)
    } catch {
      setIssue('camera-error')
      return
    }

    const video = videoRef.current
    if (!video) return
    setIssue('requesting-camera')

    try {
      streamRef.current = await startCamera(video)
    } catch (error) {
      setIssue(cameraIssueFromError(error))
      detectorRef.current?.close()
      detectorRef.current = null
      classifierRef.current?.dispose()
      classifierRef.current = null
      return
    }

    setRunning(true)
    setIssue('tracking')
    countdownStartRef.current = 0
    wasPersonDetectedRef.current = false
    postureTrackerRef.current.reset()

    const tick = () => {
      const detector = detectorRef.current
      const classifier = classifierRef.current
      const el = videoRef.current
      if (!detector || !classifier || !el) return

      const now = performance.now()

      // Handle pose selection switch — restart 5s countdown
      if (prevTargetRef.current !== targetRef.current) {
        prevTargetRef.current = targetRef.current
        countdownStartRef.current = wasPersonDetectedRef.current ? now : 0
        postureTrackerRef.current.reset()
      }

      const detected = detector.detect(el, now)

      if (!detected) {
        wasPersonDetectedRef.current = false
        countdownStartRef.current = 0
        setIssue('no-person')
        setLandmarks(null)
        setLabel(null)
        setConfidence(0)
        setGuidance(EMPTY_COACH)
        setCountdownActive(false)
        setCountdownRemainingSec(0)
        setCountdownProgress(0)
        setPostureEvaluation(null)
      } else {
        // Person is detected
        if (!wasPersonDetectedRef.current) {
          wasPersonDetectedRef.current = true
          countdownStartRef.current = now
          postureTrackerRef.current.reset()
        }

        const elapsedMs = now - countdownStartRef.current
        const isCountingDown = elapsedMs < COUNTDOWN_DURATION_MS
        const remainingSec = isCountingDown
          ? Math.max(1, Math.ceil((COUNTDOWN_DURATION_MS - elapsedMs) / 1000))
          : 0
        const progress = isCountingDown
          ? Math.min(1, Math.max(0, elapsedMs / COUNTDOWN_DURATION_MS))
          : 1

        // ML classification forward pass
        const mlResult = classifier.classify(detected.normalized)
        const smoothed = emptyScores()
        for (const id of POSE_CLASSES) {
          smoothed[id] = scoresRef.current[id] * (1 - SMOOTH) + mlResult.scores[id] * SMOOTH
        }
        scoresRef.current = smoothed

        let bestClass: PoseClassId | null = null
        let bestScore = 0
        for (const id of POSE_CLASSES) {
          if (smoothed[id] > bestScore) {
            bestScore = smoothed[id]
            bestClass = id
          }
        }
        const predicted = bestScore >= 0.4 ? bestClass : null
        const activeTarget = targetRef.current ?? predicted ?? 'downdog'
        const targetMlProb = smoothed[activeTarget] ?? bestScore

        if (isCountingDown) {
          // ── PHASE 1: 5-SECOND POSTURE ANALYSIS COUNTDOWN ────────────────────
          // DO NOT generate a matching score or declare the pose correct.
          setCountdownActive(true)
          setCountdownRemainingSec(remainingSec)
          setCountdownProgress(progress)

          setIssue('tracking')
          setLandmarks(detected.normalized)
          setLabel(predicted)
          setConfidence(0) // No matching score during countdown
          setScores(smoothed)
          setPostureEvaluation(null)

          setGuidance({
            cues: [`Analyzing posture… hold steady (${remainingSec}s)`],
            cuesMr: [`मुद्रा विश्लेषण सुरू आहे… स्थिर रहा (${remainingSec} से)`],
            detailedCues: [],
            status: 'okay',
            score: 0, // No score declared during initial analysis
            matched: false, // Do not declare pose correct during initial analysis
            isSettling: true,
            settlingRemainingSec: remainingSec,
          })
        } else {
          // ── PHASE 2: CONTINUOUS BIOMECHANICAL POSTURE CORRECTION ────────────
          setCountdownActive(false)
          setCountdownRemainingSec(0)
          setCountdownProgress(1)

          // Run rigorous anatomical angle and alignment comparison
          const evalResult = evaluatePoseAlignment(activeTarget, detected.normalized, targetMlProb)

          // Smooth score with light EMA (0.35) for crisp, stable responsiveness
          if (recentScoreEmaRef.current === 0) {
            recentScoreEmaRef.current = evalResult.accuracy
          } else {
            recentScoreEmaRef.current =
              recentScoreEmaRef.current * 0.65 + evalResult.accuracy * 0.35
          }
          const dynamicAccuracy = Math.round(recentScoreEmaRef.current)

          // Update real-time mistake & correction tracker
          postureTrackerRef.current.update(evalResult, now)
          const liveReport = postureTrackerRef.current.getLiveReport(dynamicAccuracy)

          setIssue('tracking')
          setLandmarks(detected.normalized)
          setLabel(predicted)
          setConfidence(dynamicAccuracy / 100)
          setScores(smoothed)
          setPostureEvaluation(evalResult)
          setLiveProgress(liveReport)

          // Direct specific correction cues
          const activeCues =
            evalResult.faults.length > 0
              ? evalResult.faults.map((f) => `${f.jointNameEn}: ${f.en}`)
              : [evalResult.primaryCueEn]

          const activeCuesMr =
            evalResult.faults.length > 0
              ? evalResult.faults.map((f) => `${f.jointNameMr}: ${f.mr}`)
              : [evalResult.primaryCueMr]

          setGuidance({
            cues: activeCues,
            cuesMr: activeCuesMr,
            detailedCues: evalResult.faults,
            status: evalResult.status,
            score: dynamicAccuracy / 100,
            matched: evalResult.isMatched,
            isSettling: false,
            settlingRemainingSec: 0,
          })
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [stop])

  useEffect(() => {
    void start()
    return () => stop()
  }, [start, stop])

  return {
    videoRef,
    issue,
    running,
    landmarks,
    label,
    confidence,
    scores,
    guidance,
    countdownActive,
    countdownRemainingSec,
    countdownProgress,
    postureEvaluation,
    liveProgress,
    postureTracker: postureTrackerRef.current,
    frozenState,
    unfreeze,
    freeze,
    start,
    stop,
  }
}
