import type { SessionSummaryData } from '../types/session'

interface SessionSummaryModalProps {
  session: SessionSummaryData
  onClose: () => void
  onViewHistory?: () => void
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function SessionSummaryModal({
  session,
  onClose,
  onViewHistory,
}: SessionSummaryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040506]/85 backdrop-blur-md overflow-y-auto animate-hero-reveal">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#363739] bg-[#07080a] p-6 sm:p-8 key-shadow max-h-[90vh] overflow-y-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#363739]/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wide text-emerald-300 uppercase">
                Session Complete · सत्र समाप्त
              </span>
              <span className="text-xs font-mono text-[#6a6b6c]">
                {new Date(session.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              {session.poseName || session.poseId}{' '}
              {session.poseSanskrit && (
                <span className="text-lg font-normal text-[#9c9c9d]">
                  ({session.poseSanskrit})
                </span>
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#363739] p-2 text-[#9c9c9d] hover:bg-[#111214] hover:text-white transition-colors"
            title="Close summary"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 4 Core KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Duration */}
          <div className="rounded-xl border border-[#363739]/80 bg-[#111214] p-3.5 key-shadow-subtle">
            <p className="text-[10px] font-mono tracking-wider text-[#9c9c9d] uppercase">
              Duration / वेळ
            </p>
            <p className="mt-1 text-2xl font-bold text-white tabular-nums font-mono">
              {formatDuration(session.durationSec)}
            </p>
            <p className="mt-1 text-[10px] font-mono text-[#6a6b6c]">
              Hold: {formatDuration(session.matchedTimeSec)}
            </p>
          </div>

          {/* Camera Pose Accuracy */}
          <div className="rounded-xl border border-emerald-500/40 bg-[#111214] p-3.5 key-shadow-subtle">
            <p className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase">
              Pose Accuracy
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-400 tabular-nums font-mono">
              {session.cameraAccuracy}%
            </p>
            <p className="mt-1 text-[10px] font-mono text-[#6a6b6c]">
              Joint Precision
            </p>
          </div>

          {/* Smart Mat Score */}
          <div className="rounded-xl border border-sky-500/40 bg-[#111214] p-3.5 key-shadow-subtle">
            <p className="text-[10px] font-mono tracking-wider text-sky-400 uppercase">
              Mat Balance
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-400 tabular-nums font-mono">
              {session.matBalanceScore}%
            </p>
            <p className="mt-1 text-[10px] font-mono text-[#6a6b6c]">
              Equilibrium
            </p>
          </div>

          {/* Corrections Made */}
          <div className="rounded-xl border border-amber-500/40 bg-[#111214] p-3.5 key-shadow-subtle">
            <p className="text-[10px] font-mono tracking-wider text-amber-300 uppercase">
              Corrections Made
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-300 tabular-nums font-mono">
              {session.correctionsPerformed ?? 0}
            </p>
            <p className="mt-1 text-[10px] font-mono text-[#6a6b6c]">
              {session.improvementPct != null
                ? `${session.improvementPct >= 0 ? '+' : ''}${session.improvementPct}% trend`
                : 'Form adjustments'}
            </p>
          </div>
        </div>

        {/* Top Joint Deviations / Detected Mistakes */}
        {session.topFaults && session.topFaults.length > 0 && (
          <div>
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-xs font-mono font-semibold tracking-wider text-[#ff6363] uppercase">
                Detected Joint Angle Deviations · सांधे कोन सुधारणा
              </h3>
              <span className="text-[10px] font-mono text-[#6a6b6c]">Biomechanical faults</span>
            </div>
            <div className="space-y-2">
              {session.topFaults.map((fault) => (
                <div
                  key={fault.id}
                  className="rounded-xl border border-[#363739]/60 bg-[#111214] p-3 key-shadow-subtle flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {fault.jointNameEn} <span className="text-[#9c9c9d] font-normal">({fault.jointNameMr})</span>
                    </p>
                    <p className="text-[11px] text-[#9c9c9d] mt-0.5">{fault.sampleCueEn}</p>
                  </div>
                  <span className="rounded border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300">
                    ±{fault.avgDeviationDeg}° ({fault.count}x)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personalized Improvement Suggestions */}
        {session.suggestions && session.suggestions.length > 0 && (
          <div>
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-xs font-mono font-semibold tracking-wider text-[#9c9c9d] uppercase">
                Personalized Guidance · वैयक्तिक सुधारणा
              </h3>
              <span className="text-[11px] font-mono text-[#6a6b6c]">Actionable cues</span>
            </div>

            <div className="space-y-2.5">
              {session.suggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#363739]/60 bg-[#111214] p-3.5 key-shadow-subtle transition-all hover:border-[#ff6363]/40"
                >
                  <p className="text-xs text-white leading-relaxed font-medium">
                    {item.en}
                  </p>
                  <p className="mt-1 text-xs text-[#9c9c9d] leading-relaxed">
                    {item.mr}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#363739]/60">
          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="rounded-lg border border-[#363739] bg-[#111214] px-4 py-2 text-xs font-semibold text-white hover:border-[#ff6363] transition-all"
            >
              View Progress Reports
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#e6e6e6] px-5 py-2 text-xs font-semibold text-[#1b1c1e] hover:bg-white transition-all key-shadow"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  )
}
