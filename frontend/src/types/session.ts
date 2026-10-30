import type { PoseClassId } from '../lib/landmarks'

export interface JointFaultSummary {
  id: string
  jointNameEn: string
  jointNameMr: string
  count: number
  avgDeviationDeg: number
  sampleCueEn: string
  sampleCueMr: string
}

export interface BalanceMetrics {
  weightDistributionLeft: number // 0-100 (%)
  weightDistributionRight: number // 0-100 (%)
  stabilityScore: number // 0-100
  stabilityRating: 'Excellent' | 'Good' | 'Moderate' | 'Needs Work'
  swayIndex: number // 0-100 (lower means steadier)
}

export interface PersonalizedSuggestion {
  en: string
  mr: string
  category: 'alignment' | 'balance' | 'breathing' | 'praise'
}

export interface SessionSummaryData {
  id: string
  date: string // ISO string
  timestamp: number // ms epoch
  poseId: PoseClassId
  poseName: string
  poseSanskrit: string
  durationSec: number
  cameraAccuracy: number // 0-100
  matBalanceScore: number // 0-100
  combinedScore: number // 0-100
  bestStreakSec: number
  matchedTimeSec: number
  topFaults: JointFaultSummary[]
  suggestions: PersonalizedSuggestion[]
  balanceMetrics: BalanceMetrics
  correctionsPerformed?: number
  improvementPct?: number
  accuracyHistory?: number[]
}

export interface DailyProgressPoint {
  dateKey: string // YYYY-MM-DD
  label: string // e.g. "Oct 25"
  sessionCount: number
  avgCameraAccuracy: number
  avgMatBalance: number
  avgCombinedScore: number
  totalDurationSec: number
}

export interface WeeklyProgressPoint {
  weekKey: string // e.g. "W43"
  label: string // e.g. "Oct 19 - 25"
  sessionCount: number
  avgCameraAccuracy: number
  avgMatBalance: number
  avgCombinedScore: number
  totalDurationSec: number
}

export interface PerformanceComparison {
  hasComparison: boolean
  recentSession: SessionSummaryData
  previousSession: SessionSummaryData | null
  deltaCameraAccuracy: number // recent - previous
  deltaMatBalance: number
  deltaCombinedScore: number
  deltaDurationSec: number
  trend: 'improving' | 'steady' | 'declining'
}

export interface ImprovementTrend {
  overallTrendPct: number // % change over historical sessions
  totalSessions: number
  totalDurationSec: number
  bestCombinedScore: number
  avgCombinedScore: number
  areasNeedingImprovement: {
    jointNameEn: string
    jointNameMr: string
    faultFrequency: number
    avgDeviationDeg: number
    recommendationEn: string
    recommendationMr: string
  }[]
  strengths: {
    titleEn: string
    titleMr: string
    descriptionEn: string
    descriptionMr: string
  }[]
}
