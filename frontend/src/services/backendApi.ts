/**
 * backendApi.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client service to communicate with the SmartYoga AI Backend API (hosted on Render).
 *
 * Configurable via environment variable:
 *   VITE_BACKEND_URL=https://smartyoga-backend.onrender.com
 * Defaults to local development: http://localhost:5000
 */

import type { SessionSummaryData } from '../types/session'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '')

export interface BackendHealth {
  status: string
  timestamp: string
  uptimeSeconds: number
  memoryUsageMB: number
}

export interface MatTelemetryData {
  timestamp: number
  connected: boolean
  deviceId: string
  sensors: {
    p1: number
    p2: number
    p3: number
    p4: number
    p5: number
    p6: number
  }
  balance: {
    weightLeft: number
    weightRight: number
    balanceScore: number
    stabilityRating: string
    swayIndex: number
  }
}

export const backendApi = {
  get baseUrl(): string {
    return BACKEND_URL
  },

  /** Check if the Render backend is reachable and healthy */
  async checkHealth(): Promise<BackendHealth | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { method: 'GET' })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  },

  /** Fetch current smart mat telemetry from the backend */
  async getMatStatus(): Promise<MatTelemetryData | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/mat/status`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data || null
    } catch {
      return null
    }
  },

  /** Post live sensor readings to the backend */
  async postMatTelemetry(
    sensors: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number },
    deviceId = 'WEB_CLIENT'
  ): Promise<boolean> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/mat/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensors, deviceId })
      })
      return res.ok
    } catch {
      return false
    }
  },

  /** Persist completed session to the Render backend */
  async saveSession(session: SessionSummaryData): Promise<boolean> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      })
      return res.ok
    } catch {
      return false
    }
  },

  /** Fetch session history from backend */
  async getSessions(poseId?: string): Promise<SessionSummaryData[]> {
    try {
      const url = poseId
        ? `${BACKEND_URL}/api/sessions?poseId=${encodeURIComponent(poseId)}`
        : `${BACKEND_URL}/api/sessions`
      const res = await fetch(url)
      if (!res.ok) return []
      const json = await res.json()
      return json.sessions || []
    } catch {
      return []
    }
  },

  /** Fetch longitudinal analytics summary */
  async getAnalyticsSummary() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/analytics/summary`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data || null
    } catch {
      return null
    }
  }
}

