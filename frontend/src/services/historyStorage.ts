import type {
  SessionSummaryData,
  DailyProgressPoint,
  WeeklyProgressPoint,
  PerformanceComparison,
  ImprovementTrend,
} from '../types/session'
import { ref, set } from 'firebase/database'
import { db } from '../lib/firebase'

const STORAGE_KEY = 'yoga_pose_session_history_v1'

export const historyStorage = {
  getStoredSessions(): SessionSummaryData[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []

      // Sanitize each session object to prevent runtime errors from corrupt / legacy records
      const valid = parsed
        .filter((s): s is SessionSummaryData => s != null && typeof s === 'object' && typeof (s as any).id === 'string')
        .map((s) => ({
          ...s,
          durationSec: Number(s.durationSec) || 0,
          cameraAccuracy: Number(s.cameraAccuracy) || 0,
          matBalanceScore: Number(s.matBalanceScore) || 0,
          combinedScore: Number(s.combinedScore) || 0,
          timestamp: Number(s.timestamp) || Date.now(),
          matchedTimeSec: Number(s.matchedTimeSec) || 0,
          bestStreakSec: Number(s.bestStreakSec) || 0,
          correctionsPerformed: Number(s.correctionsPerformed) || 0,
          improvementPct: Number(s.improvementPct) || 0,
          accuracyHistory: Array.isArray(s.accuracyHistory) ? s.accuracyHistory : [],
          topFaults: Array.isArray(s.topFaults) ? s.topFaults : [],
          suggestions: Array.isArray(s.suggestions) ? s.suggestions : [],
          balanceMetrics: s.balanceMetrics || {
            weightDistributionLeft: 50,
            weightDistributionRight: 50,
            stabilityScore: Number(s.matBalanceScore) || 80,
            stabilityRating: 'Good' as const,
            swayIndex: 12,
          },
        }))

      return valid.sort((a, b) => b.timestamp - a.timestamp)
    } catch (e) {
      console.warn('Failed to read session history from localStorage:', e)
      return []
    }
  },

  saveSession(session: SessionSummaryData): void {
    try {
      const existing = this.getStoredSessions()
      // Prevent duplicate saving of the exact same session ID
      const filtered = existing.filter((s) => s.id !== session.id)
      const updated = [session, ...filtered]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

      // Also persist to Firebase database /sessions if reachable
      try {
        const sessionRef = ref(db, `sessions/${session.id}`)
        void set(sessionRef, session).catch(() => {})
      } catch {
        // Fallback gracefully if Firebase is offline or unconfigured
      }
    } catch (e) {
      console.error('Failed to save session to localStorage:', e)
    }
  },

  deleteSession(id: string): void {
    try {
      const existing = this.getStoredSessions()
      const updated = existing.filter((s) => s.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

      try {
        const sessionRef = ref(db, `sessions/${id}`)
        void set(sessionRef, null).catch(() => {})
      } catch {}
    } catch (e) {
      console.error('Failed to delete session from localStorage:', e)
    }
  },

  clearAllSessions(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to clear session history:', e)
    }
  },

  getDailyProgress(sessions: SessionSummaryData[]): DailyProgressPoint[] {
    if (sessions.length === 0) return []

    // Group sessions by local date YYYY-MM-DD
    const dayMap = new Map<string, SessionSummaryData[]>()
    // Sort chronological (oldest to newest for charts)
    const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp)

    for (const s of sorted) {
      const d = new Date(s.timestamp)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`
      const list = dayMap.get(key) ?? []
      list.push(s)
      dayMap.set(key, list)
    }

    const points: DailyProgressPoint[] = []
    for (const [dateKey, daySessions] of dayMap.entries()) {
      const count = daySessions.length
      const totalCam = daySessions.reduce((acc, cur) => acc + (cur.cameraAccuracy || 0), 0)
      const totalMat = daySessions.reduce((acc, cur) => acc + (cur.matBalanceScore || 0), 0)
      const totalComb = daySessions.reduce((acc, cur) => acc + (cur.combinedScore || 0), 0)
      const totalDur = daySessions.reduce((acc, cur) => acc + (cur.durationSec || 0), 0)

      const d = new Date(daySessions[0].timestamp)
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      points.push({
        dateKey,
        label,
        sessionCount: count,
        avgCameraAccuracy: Math.round(totalCam / count),
        avgMatBalance: Math.round(totalMat / count),
        avgCombinedScore: Math.round(totalComb / count),
        totalDurationSec: totalDur,
      })
    }

    return points
  },

  getWeeklyProgress(sessions: SessionSummaryData[]): WeeklyProgressPoint[] {
    if (sessions.length === 0) return []

    const weekMap = new Map<string, SessionSummaryData[]>()
    const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp)

    for (const s of sorted) {
      const d = new Date(s.timestamp)
      const target = new Date(d.valueOf())
      const dayNr = (d.getDay() + 6) % 7
      target.setDate(target.getDate() - dayNr + 3)
      const firstThursday = target.valueOf()
      target.setMonth(0, 1)
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
      }
      const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
      const weekKey = `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`

      const list = weekMap.get(weekKey) ?? []
      list.push(s)
      weekMap.set(weekKey, list)
    }

    const points: WeeklyProgressPoint[] = []
    for (const [weekKey, weekSessions] of weekMap.entries()) {
      const count = weekSessions.length
      const totalCam = weekSessions.reduce((acc, cur) => acc + (cur.cameraAccuracy || 0), 0)
      const totalMat = weekSessions.reduce((acc, cur) => acc + (cur.matBalanceScore || 0), 0)
      const totalComb = weekSessions.reduce((acc, cur) => acc + (cur.combinedScore || 0), 0)
      const totalDur = weekSessions.reduce((acc, cur) => acc + (cur.durationSec || 0), 0)

      const d = new Date(weekSessions[0].timestamp)
      const label = `Week ${weekKey.split('-W')[1]} (${d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })})`

      points.push({
        weekKey,
        label,
        sessionCount: count,
        avgCameraAccuracy: Math.round(totalCam / count),
        avgMatBalance: Math.round(totalMat / count),
        avgCombinedScore: Math.round(totalComb / count),
        totalDurationSec: totalDur,
      })
    }

    return points
  },

  getPerformanceComparison(sessions: SessionSummaryData[]): PerformanceComparison {
    if (sessions.length === 0) {
      return {
        hasComparison: false,
        recentSession: {} as SessionSummaryData,
        previousSession: null,
        deltaCameraAccuracy: 0,
        deltaMatBalance: 0,
        deltaCombinedScore: 0,
        deltaDurationSec: 0,
        trend: 'steady',
      }
    }

    const sorted = [...sessions].sort((a, b) => b.timestamp - a.timestamp)
    const recent = sorted[0]

    if (sorted.length === 1) {
      return {
        hasComparison: false,
        recentSession: recent,
        previousSession: null,
        deltaCameraAccuracy: 0,
        deltaMatBalance: 0,
        deltaCombinedScore: 0,
        deltaDurationSec: 0,
        trend: 'steady',
      }
    }

    const previous = sorted[1]
    const deltaCamera = (Number(recent.cameraAccuracy) || 0) - (Number(previous.cameraAccuracy) || 0)
    const deltaMat = (Number(recent.matBalanceScore) || 0) - (Number(previous.matBalanceScore) || 0)
    const deltaCombined = (Number(recent.combinedScore) || 0) - (Number(previous.combinedScore) || 0)
    const deltaDuration = (Number(recent.durationSec) || 0) - (Number(previous.durationSec) || 0)

    let trend: PerformanceComparison['trend'] = 'steady'
    if (deltaCombined >= 2) trend = 'improving'
    else if (deltaCombined <= -2) trend = 'declining'

    return {
      hasComparison: true,
      recentSession: recent,
      previousSession: previous,
      deltaCameraAccuracy: Math.round(deltaCamera * 10) / 10,
      deltaMatBalance: Math.round(deltaMat * 10) / 10,
      deltaCombinedScore: Math.round(deltaCombined * 10) / 10,
      deltaDurationSec: deltaDuration,
      trend,
    }
  },

  getImprovementTrends(sessions: SessionSummaryData[]): ImprovementTrend {
    if (sessions.length === 0) {
      return {
        overallTrendPct: 0,
        totalSessions: 0,
        totalDurationSec: 0,
        bestCombinedScore: 0,
        avgCombinedScore: 0,
        areasNeedingImprovement: [],
        strengths: [],
      }
    }

    const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp)
    const totalSessions = sessions.length
    const totalDurationSec = sessions.reduce((acc, s) => acc + (Number(s.durationSec) || 0), 0)
    const scores = sessions.map((s) => Number(s.combinedScore) || 0)
    const bestCombinedScore = scores.length > 0 ? Math.max(...scores) : 0
    const avgCombinedScore = Math.round(
      scores.reduce((acc, s) => acc + s, 0) / (totalSessions || 1),
    )

    // Calculate overall improvement trend (% difference between first half and second half of history)
    let overallTrendPct = 0
    if (sorted.length >= 2) {
      const half = Math.floor(sorted.length / 2)
      const firstHalf = sorted.slice(0, half || 1)
      const secondHalf = sorted.slice(half)
      const avgFirst = firstHalf.reduce((a, b) => a + (Number(b.combinedScore) || 0), 0) / firstHalf.length
      const avgSecond = secondHalf.reduce((a, b) => a + (Number(b.combinedScore) || 0), 0) / secondHalf.length
      overallTrendPct = Math.round((avgSecond - avgFirst) * 10) / 10
    }

    // Aggregate joint faults across all sessions to identify areas needing improvement
    const faultAgg = new Map<
      string,
      {
        jointNameEn: string
        jointNameMr: string
        frequency: number
        totalDev: number
      }
    >()

    for (const s of sessions) {
      const faults = Array.isArray(s.topFaults) ? s.topFaults : []
      for (const fault of faults) {
        if (!fault || !fault.jointNameEn) continue
        const key = fault.jointNameEn
        const existing = faultAgg.get(key) ?? {
          jointNameEn: fault.jointNameEn,
          jointNameMr: fault.jointNameMr || fault.jointNameEn,
          frequency: 0,
          totalDev: 0,
        }
        existing.frequency += Number(fault.count) || 1
        existing.totalDev += (Number(fault.avgDeviationDeg) || 0) * (Number(fault.count) || 1)
        faultAgg.set(key, existing)
      }
    }

    const areasNeedingImprovement: ImprovementTrend['areasNeedingImprovement'] = []
    const sortedFaults = Array.from(faultAgg.values()).sort((a, b) => b.frequency - a.frequency)

    for (const f of sortedFaults.slice(0, 3)) {
      const avgDev = Math.round(f.totalDev / (f.frequency || 1))
      let recEn = 'Focus on controlled joint angles and steady alignment during transitions.'
      let recMr = 'आसन करताना सांध्यांचा कोन योग्य राखण्यावर आणि हालचाली स्थिर ठेवण्यावर लक्ष द्या.'

      const lower = f.jointNameEn.toLowerCase()
      if (lower.includes('knee')) {
        recEn = 'Stack knee directly above ankle; avoid collapsing inward or overextending past toes.'
        recMr = 'गुडघा थेट घोट्यावर सरळ ठेवा; आत झुकणे किंवा पायाच्या बोटांपुढे जास्त जाणे टाळा.'
      } else if (lower.includes('torso') || lower.includes('spine')) {
        recEn = 'Engage abdominal core to lift through the crown of your head and keep spine neutral.'
        recMr = 'पाठीचा कणा ताठ ठेवण्यासाठी पोटाचे स्नायू सक्रिय करा आणि डोक्याचा वरचा भाग वर उचला.'
      } else if (lower.includes('hip')) {
        recEn = 'Level and square your pelvis forward; avoid leaning into one hip socket.'
        recMr = 'दोन्ही नितंब समांतर ठेवा; एकाच बाजूच्या कमरेवर अवाजवी भार देणे टाळा.'
      } else if (lower.includes('elbow') || lower.includes('arm')) {
        recEn = 'Fully extend the arm through fingertips while softening shoulder blades downward.'
        recMr = 'खांदे खाली सैल ठेवून हाताची बोटे जमिनीला समांतर सरळ रेषेत ताणा.'
      }

      areasNeedingImprovement.push({
        jointNameEn: f.jointNameEn,
        jointNameMr: f.jointNameMr,
        faultFrequency: f.frequency,
        avgDeviationDeg: avgDev,
        recommendationEn: recEn,
        recommendationMr: recMr,
      })
    }

    // Default recommendation if no joint faults recorded yet
    if (areasNeedingImprovement.length === 0) {
      const avgMat = Math.round(
        sessions.reduce((a, b) => a + (Number(b.matBalanceScore) || 0), 0) / (totalSessions || 1),
      )
      if (avgMat < 80) {
        areasNeedingImprovement.push({
          jointNameEn: 'Smart Mat Lateral Balance',
          jointNameMr: 'स्मार्ट मॅट तोल संतुलन',
          faultFrequency: totalSessions,
          avgDeviationDeg: 8,
          recommendationEn:
            'Focus on equal ground pressure through both feet to stabilize your smart mat balance score.',
          recommendationMr:
            'मॅटवरील संतुलन सुधारण्यासाठी दोन्ही पायांवर समान भार देण्याचा सराव करा.',
        })
      }
    }

    // Determine Key Strengths
    const strengths: ImprovementTrend['strengths'] = []
    const avgCamera = Math.round(
      sessions.reduce((a, b) => a + (Number(b.cameraAccuracy) || 0), 0) / (totalSessions || 1),
    )
    const avgMat = Math.round(
      sessions.reduce((a, b) => a + (Number(b.matBalanceScore) || 0), 0) / (totalSessions || 1),
    )

    if (avgCamera >= 80) {
      strengths.push({
        titleEn: 'High Camera Pose Precision',
        titleMr: 'उत्कृष्ट कॅमेरा आसन अचूकता',
        descriptionEn: `Consistently maintaining an average camera accuracy of ${avgCamera}% across practices.`,
        descriptionMr: `सरावादरम्यान सरासरी ${avgCamera}% इतकी उच्च कॅमेरा अचूकता सातत्याने राखली आहे.`,
      })
    }

    if (avgMat >= 80) {
      strengths.push({
        titleEn: 'Solid Mat Grounding & Balance',
        titleMr: 'मॅटवरील स्थिर तोल व पकड',
        descriptionEn: `Strong core stability with ${avgMat}% average smart mat balance score.`,
        descriptionMr: `सरासरी ${avgMat}% स्मार्ट मॅट तोल गुणांसह उत्तम शारीरिक स्थिरता प्राप्त झाली आहे.`,
      })
    }

    if (totalSessions >= 3) {
      strengths.push({
        titleEn: 'Dedicated Practice Consistency',
        titleMr: 'सातत्यपूर्ण योग साधना',
        descriptionEn: `Completed ${totalSessions} guided yoga sessions with accumulating muscle memory.`,
        descriptionMr: `${totalSessions} मार्गदर्शित योग सत्रे पूर्ण करून स्नायूंची स्मरणशक्ती मजबूत केली आहे.`,
      })
    }

    return {
      overallTrendPct,
      totalSessions,
      totalDurationSec,
      bestCombinedScore,
      avgCombinedScore,
      areasNeedingImprovement,
      strengths,
    }
  },
}
