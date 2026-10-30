import { useMemo, useState } from 'react'
import type { SessionSummaryData } from '../types/session'
import { POSE_META, type PoseClassId } from '../lib/landmarks'
import { historyStorage } from '../services/historyStorage'
import { ProgressChart } from './ProgressChart'

interface HistoryAndProgressProps {
  sessions: SessionSummaryData[]
  onDeleteSession: (id: string) => void
  onClearAll: () => void
  onInspectSession: (session: SessionSummaryData) => void
  onStartPractice: () => void
  /** ID of the most recently saved session — used to show a "New" badge */
  newestSessionId?: string | null
}

function formatDuration(sec: number): string {
  const safeSec = Math.max(0, Math.round(Number(sec) || 0))
  const m = Math.floor(safeSec / 60)
  const s = safeSec % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

/** Thin score bar on dark surface */
function ScoreBar({
  value,
  colour,
}: {
  value: number
  colour: 'emerald' | 'sky' | 'coral'
}) {
  const safeVal = Math.max(0, Math.min(100, Number(value) || 0))
  const bg =
    colour === 'emerald'
      ? 'bg-[#59d499]'
      : colour === 'sky'
        ? 'bg-[#63a1ff]'
        : 'bg-[#ff6363]'
  const track = 'bg-[#1b1c1e]'

  return (
    <div className={`mt-1.5 h-1 w-full rounded-full ${track} overflow-hidden`}>
      <div
        className={`h-1 rounded-full ${bg} transition-all duration-500`}
        style={{ width: `${safeVal}%` }}
      />
    </div>
  )
}

export function HistoryAndProgress({
  sessions,
  onDeleteSession,
  onClearAll,
  onInspectSession,
  onStartPractice,
  newestSessionId,
}: HistoryAndProgressProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [poseFilter, setPoseFilter] = useState<string>('all')

  // Aggregations
  const comparison = useMemo(() => historyStorage.getPerformanceComparison(sessions), [sessions])
  const trends     = useMemo(() => historyStorage.getImprovementTrends(sessions), [sessions])

  // Filtered session list for the table
  const filteredSessions = useMemo(
    () => (poseFilter === 'all' ? sessions : sessions.filter((s) => s.poseId === poseFilter)),
    [sessions, poseFilter],
  )

  // Chart data: take the 10 most recent sessions (from filtered list if set, or all),
  // and reverse so chronological timeline flows left-to-right (oldest -> newest).
  const chartData = useMemo(() => {
    const list = poseFilter === 'all' ? sessions : filteredSessions
    const slice = list.slice(0, 10).reverse()
    return slice.map((s, idx) => {
      const poseName = s.poseName || POSE_META[s.poseId as PoseClassId]?.name || s.poseId
      return {
        label: `#${idx + 1} ${poseName.slice(0, 10)}`,
        sublabel: new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        cameraAccuracy: Number(s.cameraAccuracy) || 0,
        matBalance: Number(s.matBalanceScore) || 0,
        combinedScore: Number(s.combinedScore) || 0,
      }
    })
  }, [sessions, filteredSessions, poseFilter])

  // Export report as JSON download
  const handleExportJSON = () => {
    if (sessions.length === 0) return
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `smartyoga_progress_report_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (sessions.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-[#363739] bg-[#07080a] p-8 sm:p-12 text-center key-shadow">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#363739] bg-[#111214] text-3xl">
            📊
          </div>
          <span className="mt-4 font-mono text-[11px] uppercase tracking-widest text-[#ff6363]">
            Longitudinal Telemetry
          </span>
          <h3 className="mt-2 text-2xl font-semibold text-white tracking-tight">
            No Practice Sessions Recorded Yet
          </h3>
          <p className="mt-3 max-w-lg text-sm text-[#9c9c9d] leading-relaxed">
            अद्याप कोणताही सराव इतिहास नाही. Start your first session in the <strong className="text-white">Live Yoga Coach</strong>! The vision engine will track your 33 skeleton joints, calculate smart mat weight equilibrium, and automatically record your biomechanical progress here.
          </p>
          <button
            type="button"
            onClick={onStartPractice}
            className="mt-8 inline-flex items-center gap-2.5 rounded-lg bg-[#e6e6e6] px-6 py-3.5 text-sm font-semibold text-[#1b1c1e] hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all key-shadow"
          >
            <span>🧘</span>
            <span>Start Yoga Practice · सराव सुरू करा</span>
          </button>
        </div>
      </div>
    )
  }

  // ── Trend label helper ────────────────────────────────────────────────────
  const trendDisplay = (() => {
    if (trends.totalSessions === 1) {
      return { label: 'First Session', colour: 'text-white', sub: 'Baseline Established' }
    }
    if (trends.overallTrendPct > 0) {
      return {
        label: `+${trends.overallTrendPct}%`,
        colour: 'text-emerald-400',
        sub: 'Historical Momentum',
      }
    }
    if (trends.overallTrendPct < 0) {
      return {
        label: `${trends.overallTrendPct}%`,
        colour: 'text-rose-400',
        sub: 'Historical Momentum',
      }
    }
    return { label: '0%', colour: 'text-[#9c9c9d]', sub: 'Steady Balance' }
  })()

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#363739]/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ff6363]" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#ff6363]">Longitudinal Telemetry</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Progress Reports &amp; History
          </h2>
          <p className="mt-1 text-sm text-[#9c9c9d]">
            Detailed longitudinal performance metrics, joint angle deviation analytics, and archived session logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 rounded-lg border border-[#363739] bg-[#111214] px-3.5 py-2 text-xs font-semibold text-white hover:border-white transition-all key-shadow-subtle"
            title="Download session history as JSON"
          >
            <span>📥 Export JSON</span>
          </button>

          <button
            type="button"
            onClick={onStartPractice}
            className="inline-flex items-center gap-2 rounded-lg bg-[#e6e6e6] px-4 py-2 text-xs font-semibold text-[#1b1c1e] hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all key-shadow"
          >
            <span>+ New Practice</span>
          </button>
        </div>
      </div>

      {/* ── Overview Stat Badges ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#363739] bg-[#07080a] p-5 key-shadow">
          <p className="text-[11px] font-mono tracking-wider text-[#9c9c9d] uppercase">
            Total Sessions / एकूण सत्रे
          </p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {trends.totalSessions}
          </p>
          <p className="mt-1 text-xs text-[#6a6b6c]">Completed practices</p>
        </div>

        <div className="rounded-2xl border border-[#363739] bg-[#07080a] p-5 key-shadow">
          <p className="text-[11px] font-mono tracking-wider text-[#9c9c9d] uppercase">
            Total Practice / एकूण वेळ
          </p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {formatDuration(trends.totalDurationSec)}
          </p>
          <p className="mt-1 text-xs text-[#6a6b6c]">Time active on mat</p>
        </div>

        <div className="rounded-2xl border border-[#363739] bg-[#07080a] p-5 key-shadow">
          <p className="text-[11px] font-mono tracking-wider text-[#ff6363] uppercase">
            Best Combined Score
          </p>
          <p className="mt-2 text-3xl font-bold text-[#ff6363] tabular-nums">
            {trends.bestCombinedScore}%
          </p>
          <p className="mt-1 text-xs text-[#6a6b6c]">Peak session mark</p>
        </div>

        <div className="rounded-2xl border border-[#363739] bg-[#07080a] p-5 key-shadow">
          <p className="text-[11px] font-mono tracking-wider text-[#9c9c9d] uppercase">
            Improvement Trend / सुधारणा
          </p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${trendDisplay.colour}`}>
            {trendDisplay.label}
          </p>
          <p className="mt-1 text-xs text-[#6a6b6c]">{trendDisplay.sub}</p>
        </div>
      </div>

      {/* ── Longitudinal Trend Chart ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#363739] bg-[#07080a] p-6 key-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#363739]/60 pb-4">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Performance Trend Dynamics</h3>
            <p className="text-xs text-[#9c9c9d]">Tracking combined score, camera precision, and smart mat balance</p>
          </div>
          <span className="text-[11px] font-mono text-[#6a6b6c]">
            {poseFilter === 'all' ? `Last ${chartData.length} Recorded Sessions` : `Filtered: ${chartData.length} Sessions`}
          </span>
        </div>
        <ProgressChart data={chartData} height={260} />
      </div>

      {/* ── Performance Comparison: Recent vs Previous Session ───────────── */}
      {comparison.hasComparison && comparison.previousSession && (
        <section className="rounded-2xl border border-[#363739] bg-[#07080a] p-6 key-shadow space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#363739]/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">🔄</span>
                <h3 className="text-base font-semibold text-white">
                  Performance Delta: Recent vs. Previous Session
                </h3>
              </div>
              <p className="text-xs text-[#9c9c9d]">
                मागील व ताज्या सत्रातील कामगिरी तुलना
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-mono font-medium border ${
                comparison.trend === 'improving'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : comparison.trend === 'declining'
                    ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                    : 'bg-[#111214] text-[#9c9c9d] border-[#363739]'
              }`}
            >
              {comparison.trend === 'improving'
                ? '📈 Improving Trend / प्रगती'
                : comparison.trend === 'declining'
                  ? '📉 Needs Focus / लक्ष द्या'
                  : '⚖️ Steady Performance / स्थिर'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Combined Score Delta */}
            <div className="rounded-xl border border-[#363739]/60 bg-[#111214] p-4 key-shadow-subtle">
              <span className="text-[10px] font-mono text-[#9c9c9d] uppercase">
                Combined Score
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tabular-nums">
                  {comparison.recentSession.combinedScore}%
                </span>
                <span
                  className={`text-xs font-mono font-bold tabular-nums ${
                    comparison.deltaCombinedScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {comparison.deltaCombinedScore >= 0
                    ? `+${comparison.deltaCombinedScore}%`
                    : `${comparison.deltaCombinedScore}%`}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-mono text-[#6a6b6c]">
                Prev: {comparison.previousSession.combinedScore}%
              </p>
            </div>

            {/* Camera Pose Accuracy Delta */}
            <div className="rounded-xl border border-[#363739]/60 bg-[#111214] p-4 key-shadow-subtle">
              <span className="text-[10px] font-mono text-emerald-400 uppercase">
                Camera Pose Accuracy
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                  {comparison.recentSession.cameraAccuracy}%
                </span>
                <span
                  className={`text-xs font-mono font-bold tabular-nums ${
                    comparison.deltaCameraAccuracy >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {comparison.deltaCameraAccuracy >= 0
                    ? `+${comparison.deltaCameraAccuracy}%`
                    : `${comparison.deltaCameraAccuracy}%`}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-mono text-[#6a6b6c]">
                Prev: {comparison.previousSession.cameraAccuracy}%
              </p>
            </div>

            {/* Smart Mat Balance Delta */}
            <div className="rounded-xl border border-[#363739]/60 bg-[#111214] p-4 key-shadow-subtle">
              <span className="text-[10px] font-mono text-sky-400 uppercase">
                Smart Mat Balance
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-sky-400 tabular-nums">
                  {comparison.recentSession.matBalanceScore}%
                </span>
                <span
                  className={`text-xs font-mono font-bold tabular-nums ${
                    comparison.deltaMatBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {comparison.deltaMatBalance >= 0
                    ? `+${comparison.deltaMatBalance}%`
                    : `${comparison.deltaMatBalance}%`}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-mono text-[#6a6b6c]">
                Prev: {comparison.previousSession.matBalanceScore}%
              </p>
            </div>

            {/* Duration Delta */}
            <div className="rounded-xl border border-[#363739]/60 bg-[#111214] p-4 key-shadow-subtle">
              <span className="text-[10px] font-mono text-[#9c9c9d] uppercase">
                Practice Duration
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tabular-nums">
                  {formatDuration(comparison.recentSession.durationSec)}
                </span>
                <span
                  className={`text-xs font-mono font-bold tabular-nums ${
                    comparison.deltaDurationSec >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {comparison.deltaDurationSec >= 0
                    ? `+${comparison.deltaDurationSec}s`
                    : `${comparison.deltaDurationSec}s`}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-mono text-[#6a6b6c]">
                Prev: {formatDuration(comparison.previousSession.durationSec)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Areas Needing Improvement & Strengths ───────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Areas for Improvement */}
        <section className="rounded-2xl border border-[#363739] bg-[#07080a] p-6 key-shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-[#363739]/60 pb-3">
            <span className="text-lg">🎯</span>
            <div>
              <h3 className="text-base font-semibold text-white">
                Areas for Biomechanical Calibration
              </h3>
              <p className="text-xs text-[#9c9c9d]">
                सुधारणेची क्षेत्रे · Joint angle deviations identified across sessions
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {trends.areasNeedingImprovement.length > 0 ? (
              trends.areasNeedingImprovement.map((area, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#363739]/60 bg-[#111214] p-3.5 key-shadow-subtle"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white">
                      {area.jointNameEn} <span className="font-normal text-[#9c9c9d]">({area.jointNameMr})</span>
                    </span>
                    <span className="rounded border border-rose-500/40 bg-rose-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300 tabular-nums">
                      ±{area.avgDeviationDeg}° ({area.faultFrequency}x)
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#9c9c9d] leading-relaxed">
                    {area.recommendationEn}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6a6b6c] leading-relaxed">
                    {area.recommendationMr}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#6a6b6c] italic p-4 text-center">
                Keep practicing! Joint deviation profiles will populate as more sessions are logged.
              </p>
            )}
          </div>
        </section>

        {/* Key Strengths & Form Mastery */}
        <section className="rounded-2xl border border-[#363739] bg-[#07080a] p-6 key-shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-[#363739]/60 pb-3">
            <span className="text-lg">🌟</span>
            <div>
              <h3 className="text-base font-semibold text-white">
                Key Form Mastery &amp; Strengths
              </h3>
              <p className="text-xs text-[#9c9c9d]">
                मुख्य सामर्थ्ये · Solid stability, posture symmetry, and alignment hold
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {trends.strengths.length > 0 ? (
              trends.strengths.map((str, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#363739]/60 bg-[#111214] p-3.5 key-shadow-subtle"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-300">{str.titleEn}</span>
                    <span className="text-[10px] text-[#6a6b6c]">
                      · {str.titleMr}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#9c9c9d] leading-relaxed">
                    {str.descriptionEn}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6a6b6c] leading-relaxed">
                    {str.descriptionMr}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-[#363739]/60 bg-[#111214] p-4 text-xs text-[#9c9c9d]">
                Consistent form stability builds with regular practice. Keep up your daily routine!
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Previous Session Records Table ──────────────────────────────── */}
      <section className="rounded-2xl border border-[#363739] bg-[#07080a] key-shadow overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#363739]/60 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Archived Session Records · मागील सत्र नोंदी
            </h3>
            <p className="text-xs text-[#9c9c9d]">
              Complete archive of past yoga sessions with performance scores and date records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Pose filter dropdown */}
            {sessions.length > 1 && (
              <select
                value={poseFilter}
                onChange={(e) => setPoseFilter(e.target.value)}
                className="rounded-lg border border-[#363739] bg-[#111214] px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#ff6363]"
                aria-label="Filter by pose"
              >
                <option value="all">All Poses ({sessions.length})</option>
                {Array.from(new Set(sessions.map((s) => s.poseId)))
                  .sort((a, b) => {
                    const nameA = POSE_META[a as PoseClassId]?.name || sessions.find((s) => s.poseId === a)?.poseName || a
                    const nameB = POSE_META[b as PoseClassId]?.name || sessions.find((s) => s.poseId === b)?.poseName || b
                    return nameA.localeCompare(nameB)
                  })
                  .map((id) => {
                    const count = sessions.filter((s) => s.poseId === id).length
                    const displayName = POSE_META[id as PoseClassId]?.name || sessions.find((s) => s.poseId === id)?.poseName || id
                    return (
                      <option key={id} value={id}>
                        {displayName} ({count})
                      </option>
                    )
                  })}
              </select>
            )}

            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400 font-semibold">Confirm clear?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearAll()
                    setShowClearConfirm(false)
                    setPoseFilter('all')
                  }}
                  className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
                >
                  Yes, Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg border border-[#363739] bg-[#111214] px-2 py-1 text-xs text-[#9c9c9d]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs font-mono text-[#6a6b6c] hover:text-rose-400 transition-colors"
              >
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* No results for active pose filter */}
        {filteredSessions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#9c9c9d]">
            No sessions recorded for this pose yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111214] border-b border-[#363739]/60 text-[#9c9c9d] font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Date &amp; Asana</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5 text-center">Camera Pose</th>
                  <th className="px-4 py-3.5 text-center">Smart Mat</th>
                  <th className="px-4 py-3.5 text-center">Combined</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#363739]/40">
                {filteredSessions.map((item) => {
                  const isConfirmingDelete = deleteConfirmId === item.id
                  const isNewest = newestSessionId != null && item.id === newestSessionId
                  const d = new Date(item.timestamp)
                  const dateStr = d.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  const timeStr = d.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  const poseDisplayName = item.poseName || POSE_META[item.poseId as PoseClassId]?.name || item.poseId
                  const poseSanskritName = item.poseSanskrit || POSE_META[item.poseId as PoseClassId]?.sanskrit || ''

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isNewest
                          ? 'bg-[#1b1c1e]/60 hover:bg-[#1b1c1e]'
                          : 'hover:bg-[#111214]/60'
                      }`}
                    >
                      {/* Date & Pose */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white">
                                {poseDisplayName}{' '}
                                {poseSanskritName && (
                                  <span className="font-normal text-[#9c9c9d]">
                                    ({poseSanskritName})
                                  </span>
                                )}
                              </p>
                              {isNewest && (
                                <span className="rounded-full border border-[#ff6363]/40 bg-[#452324] px-2 py-0.5 text-[9px] font-mono font-bold tracking-wide text-[#ff6363] uppercase">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-[#6a6b6c] mt-0.5">
                              {dateStr} · {timeStr}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-4 font-mono tabular-nums text-[#9c9c9d]">
                        {formatDuration(item.durationSec)}
                      </td>

                      {/* Camera Pose */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-0.5 font-mono font-bold text-emerald-300 tabular-nums">
                          {item.cameraAccuracy}%
                        </span>
                        <ScoreBar value={item.cameraAccuracy} colour="emerald" />
                      </td>

                      {/* Smart Mat */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block rounded-lg border border-sky-500/40 bg-sky-950/40 px-2.5 py-0.5 font-mono font-bold text-sky-300 tabular-nums">
                          {item.matBalanceScore}%
                        </span>
                        <ScoreBar value={item.matBalanceScore} colour="sky" />
                      </td>

                      {/* Combined */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block rounded-lg border border-[#ff6363]/40 bg-[#452324] px-2.5 py-0.5 font-mono font-bold text-[#ff6363] tabular-nums">
                          {item.combinedScore}%
                        </span>
                        <ScoreBar value={item.combinedScore} colour="coral" />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectSession(item)}
                            className="rounded-lg border border-[#363739] bg-[#111214] px-3 py-1 text-xs font-medium text-white hover:border-[#ff6363] transition-all key-shadow-subtle"
                          >
                            Inspect
                          </button>

                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteSession(item.id)
                                  setDeleteConfirmId(null)
                                }}
                                className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded-lg border border-[#363739] bg-[#111214] px-2 py-1 text-xs text-[#9c9c9d]"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="rounded-lg p-1.5 text-[#6a6b6c] hover:text-rose-400 hover:bg-[#111214] transition-colors"
                              title="Delete record"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
