/**
 * coachCues.ts
 * Lightweight coaching types used across the app.
 * All classification is now done by the trained ML model (mlClassifier.ts).
 * This file no longer contains any angle geometry logic.
 */

import type { PoseClassId } from './landmarks'

export type FormStatus = 'good' | 'okay' | 'off'

/** A single corrective cue shown in the UI (no angle data — ML model only classifies). */
export type DetailedCue = {
  id: string
  jointNameEn: string
  jointNameMr: string
  en: string
  mr: string
}

export type CoachResult = {
  cues: string[]
  cuesMr: string[]
  detailedCues: DetailedCue[]
  status: FormStatus
  score: number
  matched: boolean
  isSettling?: boolean
  settlingRemainingSec?: number
}

export function statusLabel(status: FormStatus, lang: 'en' | 'mr' = 'en'): string {
  if (status === 'good') return lang === 'mr' ? 'योग्य मुद्रा (जुळले)' : 'On track'
  if (status === 'okay') return lang === 'mr' ? 'जवळपास जुळले' : 'Almost there'
  return lang === 'mr' ? 'सुधारणा आवश्यक' : 'Needs adjustment'
}

/** Derive FormStatus from a 0–1 score. */
export function statusFromScore(score: number): FormStatus {
  if (score >= 0.75) return 'good'
  if (score >= 0.50) return 'okay'
  return 'off'
}

/** True when the score for the target pose crosses the match threshold (with hysteresis). */
export function matchesSelectedPose(
  targetId: PoseClassId,
  scores: Record<PoseClassId, number>,
  currentlyMatched = false,
): boolean {
  const score = scores[targetId] ?? 0
  const threshold = currentlyMatched ? 0.55 : 0.65
  return score >= threshold
}
