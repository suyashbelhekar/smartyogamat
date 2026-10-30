import { useCallback, useEffect, useRef, useState } from 'react'
import type { Landmark } from '../lib/drawPose'
import { POSE_META, type PoseClassId } from '../lib/landmarks'
import {
  MatBalanceTracker,
  generateSessionSuggestions,
  type FrameBalanceResult,
} from '../lib/balanceAnalyzer'
import type { SessionSummaryData } from '../types/session'
import type { LivePostureProgress } from '../lib/postureEngine'

interface UseSessionTrackerProps {
  isRunning: boolean
  isTracking: boolean
  isMatched: boolean
  poseId: PoseClassId | null
  landmarks: Landmark[] | null
  currentScore: number
  liveProgress?: LivePostureProgress
  countdownActive?: boolean
}

export function useSessionTracker({
  isRunning,
  isTracking,
  isMatched,
  poseId,
  landmarks,
  currentScore,
  liveProgress,
  countdownActive = false,
}: UseSessionTrackerProps) {
  const [elapsedSec, setElapsedSec] = useState(0)
  const [liveBalance, setLiveBalance] = useState<FrameBalanceResult>({
    weightLeft: 50,
    weightRight: 50,
    instantScore: 80,
    swayDistance: 0,
  })

  const balanceTrackerRef = useRef(new MatBalanceTracker())
  const startTimeRef = useRef<number | null>(null)
  const cameraScoresRef = useRef<number[]>([])
  const matchedFramesRef = useRef(0)
  const totalFramesRef = useRef(0)

  useEffect(() => {
    if (isRunning) {
      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now()
        balanceTrackerRef.current.reset()
        cameraScoresRef.current = []
        matchedFramesRef.current = 0
        totalFramesRef.current = 0
        setElapsedSec(0)
      }
      const timer = setInterval(() => {
        if (startTimeRef.current !== null) {
          setElapsedSec(Math.floor((performance.now() - startTimeRef.current) / 1000))
        }
      }, 1000)
      return () => clearInterval(timer)
    } else {
      startTimeRef.current = null
      setElapsedSec(0)
    }
  }, [isRunning])

  useEffect(() => {
    if (!isRunning || !isTracking || !landmarks) return
    // Only accumulate practice metrics outside countdown
    if (!countdownActive) {
      totalFramesRef.current += 1
      if (isMatched) matchedFramesRef.current += 1
      cameraScoresRef.current.push(Math.max(0, Math.min(1, currentScore)))
    }
    const balance = balanceTrackerRef.current.processFrame(landmarks, poseId)
    setLiveBalance(balance)
  }, [isRunning, isTracking, isMatched, landmarks, currentScore, poseId, countdownActive])

  const createSessionSummary = useCallback(
    (targetPoseId: PoseClassId): SessionSummaryData | null => {
      const now = performance.now()
      const start = startTimeRef.current
      const durationSec = start ? Math.max(1, Math.round((now - start) / 1000)) : 1

      if (totalFramesRef.current < 5 && durationSec < 2) return null

      const meta = POSE_META[targetPoseId] ?? {
        name: targetPoseId,
        sanskrit: targetPoseId,
        modelClass: targetPoseId,
        group: 'standing' as const,
        icon: '🧘',
      }

      // Calculate camera accuracy from actual posture history if available, else average of frames
      let cameraAccuracy = 75
      if (liveProgress?.accuracyHistory && liveProgress.accuracyHistory.length > 0) {
        const sum = liveProgress.accuracyHistory.reduce((a, b) => a + b, 0)
        cameraAccuracy = Math.round(sum / liveProgress.accuracyHistory.length)
      } else if (cameraScoresRef.current.length > 0) {
        const avg = cameraScoresRef.current.reduce((a, b) => a + b, 0) / cameraScoresRef.current.length
        cameraAccuracy = Math.round(Math.max(30, Math.min(99, avg * 100)))
      }

      const balanceMetrics = balanceTrackerRef.current.getSessionMetrics()
      const matBalanceScore = balanceMetrics.stabilityScore
      const combinedScore = Math.round(cameraAccuracy * 0.6 + matBalanceScore * 0.4)

      const matchedRatio = totalFramesRef.current > 0 ? matchedFramesRef.current / totalFramesRef.current : 0
      const matchedTimeSec = Math.round(durationSec * matchedRatio)

      // Actual detected mistakes from posture engine
      const topFaults = liveProgress?.topFaultsSummary ?? []
      const correctionsPerformed = liveProgress?.correctionsCount ?? 0
      const improvementPct = liveProgress?.improvementPct ?? 0
      const accuracyHistory = liveProgress?.accuracyHistory ?? []

      const suggestions = generateSessionSuggestions(
        targetPoseId,
        cameraAccuracy,
        balanceMetrics,
        topFaults,
        durationSec,
        matchedTimeSec,
      )

      return {
        id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        timestamp: Date.now(),
        poseId: targetPoseId,
        poseName: meta.name,
        poseSanskrit: meta.sanskrit,
        durationSec,
        cameraAccuracy,
        matBalanceScore,
        combinedScore,
        bestStreakSec: matchedTimeSec,
        matchedTimeSec,
        topFaults,
        suggestions,
        balanceMetrics,
        correctionsPerformed,
        improvementPct,
        accuracyHistory,
      }
    },
    [liveProgress],
  )

  return { elapsedSec, liveBalance, createSessionSummary }
}
