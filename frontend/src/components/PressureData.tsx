import { useEffect, useState } from 'react'
import {
  subscribePressure,
  DEFAULT_SNAPSHOT,
  type PressureSnapshot,
  type RegionData,
} from '../services/pressureService'

// ─── helpers ────────────────────────────────────────────────────────────────

/** Convert raw 0–1023 ADC to 0–100 percentage */
function toPercent(raw: number): number {
  return Math.round((raw / 1023) * 100)
}

/** Dynamic color styling based on pressure percentage */
function barGradient(pct: number): string {
  if (pct >= 75) return 'from-rose-500 to-amber-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
  if (pct >= 45) return 'from-amber-400 to-yellow-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
  return 'from-emerald-400 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
}

function textColour(pct: number): string {
  if (pct >= 75) return 'text-rose-400'
  if (pct >= 45) return 'text-amber-400'
  return 'text-emerald-400'
}

/** Format timestamp */
function formatTime(ts: number): string {
  if (ts === 0) return '—'
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── sub-components ──────────────────────────────────────────────────────────

function FsrGauge({
  label,
  raw,
}: {
  label: string
  raw: number
}) {
  const pct = toPercent(raw)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#363739]/60 bg-[#111214]/60 p-3 key-shadow-subtle">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-[#9c9c9d]">{label}</span>
        <span className={`font-mono text-sm font-bold tabular-nums ${textColour(pct)}`}>
          {raw} <span className="text-[10px] font-normal text-[#6a6b6c]">/ 1023</span>
        </span>
      </div>

      {/* Bar track */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1b1c1e] p-0.5">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${barGradient(pct)}`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-[#6a6b6c]">
        <span>0</span>
        <span className={`font-bold ${textColour(pct)}`}>{pct}% LOAD</span>
        <span>100%</span>
      </div>
    </div>
  )
}

function RegionCard({
  title,
  icon,
  data,
}: {
  title: string
  icon: string
  data: RegionData
}) {
  const avg = Math.round((toPercent(data.fsr1) + toPercent(data.fsr2)) / 2)

  return (
    <div className="flex flex-col rounded-2xl border border-[#363739] bg-[#07080a] p-6 key-shadow transition-all duration-300 hover:border-[#454647]">
      {/* Card header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#363739] bg-[#111214] text-lg">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">{title} Zone</h3>
            <p className="text-xs text-[#9c9c9d]">Dual-Sensor Channel</p>
          </div>
        </div>
        <span className="rounded-lg border border-[#363739] bg-[#111214] px-3 py-1 text-xs font-mono font-bold text-white">
          Avg <span className={textColour(avg)}>{avg}%</span>
        </span>
      </div>

      {/* Two sensor gauges */}
      <div className="space-y-3 flex-1">
        <FsrGauge label="Sensor 1 (FSR-A)" raw={data.fsr1} />
        <FsrGauge label="Sensor 2 (FSR-B)" raw={data.fsr2} />
      </div>

      {/* Raw ADC strip */}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-[#363739]/50 bg-[#111214] px-3 py-2 text-[11px] font-mono">
        <span className="text-[#6a6b6c] uppercase tracking-wider text-[10px]">ADC Values:</span>
        <div className="flex items-center gap-3">
          <span className="text-[#9c9c9d]">CH1: <strong className="text-white">{data.fsr1}</strong></span>
          <span className="text-[#363739]">|</span>
          <span className="text-[#9c9c9d]">CH2: <strong className="text-white">{data.fsr2}</strong></span>
        </div>
      </div>
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export function PressureData() {
  const [data, setData]           = useState<PressureSnapshot>(DEFAULT_SNAPSHOT)
  const [connected, setConnected] = useState<'connecting' | 'live' | 'error'>('connecting')
  const [errorMsg, setErrorMsg]   = useState<string>('')

  useEffect(() => {
    const unsub = subscribePressure(
      (snap) => {
        setData(snap)
        setConnected('live')
      },
      (err) => {
        setConnected('error')
        setErrorMsg(err.message)
      },
    )
    return unsub
  }, [])

  // Aggregate balance computation
  const totalFront  = toPercent(data.front.fsr1) + toPercent(data.front.fsr2)
  const totalMiddle = toPercent(data.middle.fsr1) + toPercent(data.middle.fsr2)
  const totalBack   = toPercent(data.back.fsr1) + toPercent(data.back.fsr2)
  const overallLoad = Math.round((totalFront + totalMiddle + totalBack) / 6)

  const leftLoad  = Math.round((toPercent(data.front.fsr1) + toPercent(data.middle.fsr1) + toPercent(data.back.fsr1)) / 3)
  const rightLoad = Math.round((toPercent(data.front.fsr2) + toPercent(data.middle.fsr2) + toPercent(data.back.fsr2)) / 3)

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#363739]/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ff6363]" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#ff6363]">IoT Mat Telemetry</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Pressure Monitoring
          </h2>
          <p className="mt-1 text-sm text-[#9c9c9d] max-w-2xl">
            Live 6-node FSR pressure distribution transmitted via ESP32 microcontroller into Firebase Realtime Database.
          </p>
        </div>

        {/* Connection status badge */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-mono font-medium border ${
            connected === 'live'       ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]' :
            connected === 'error'      ? 'bg-rose-950/40    text-rose-300    border-rose-500/40'    :
                                         'bg-amber-950/40   text-amber-300   border-amber-500/40'
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              connected === 'live'  ? 'animate-pulse bg-emerald-400' :
              connected === 'error' ? 'bg-rose-500'                  :
                                      'animate-ping bg-amber-400'
            }`} />
            {connected === 'live'       ? `LIVE SYNC · ${formatTime(data.updatedAt)}` :
             connected === 'error'      ? 'CONNECTION FAILED'                         :
                                          'CONNECTING TO FIREBASE…'}
          </div>
        </div>
      </div>

      {/* Error notice */}
      {connected === 'error' && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-5 text-sm text-rose-300 key-shadow">
          <p className="font-bold flex items-center gap-2">
            <span>⚠️</span> Firebase connection failed
          </p>
          <p className="mt-1 text-xs text-rose-400/90">{errorMsg}</p>
          <p className="mt-3 text-xs text-[#9c9c9d]">
            Ensure valid Firebase configuration in <code className="rounded bg-[#111214] px-1.5 py-0.5 text-white">src/lib/firebase.ts</code> and verify that the ESP32 firmware is publishing ADC readings to the <code className="rounded bg-[#111214] px-1.5 py-0.5 text-white">/pressure</code> path.
          </p>
        </div>
      )}

      {/* ── Wide Horizontal Mat Visualization ── */}
      <div className="rounded-2xl border border-[#363739] bg-[#07080a] p-6 key-shadow">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-[#363739]/60 pb-6 mb-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#9c9c9d]">Equilibrium Map</span>
            <h3 className="text-lg font-semibold text-white">Dual-Foot Mat Topology</h3>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[#6a6b6c]">Overall Mat Load:</span>
              <span className={`font-bold text-sm ${textColour(overallLoad)}`}>{overallLoad}%</span>
            </div>
            <div className="h-4 w-px bg-[#363739]" />
            <div className="flex items-center gap-2">
              <span className="text-[#6a6b6c]">Left / Right Symmetry:</span>
              <span className="font-bold text-white">{leftLoad}% <span className="text-[#6a6b6c]">L</span> / {rightLoad}% <span className="text-[#6a6b6c]">R</span></span>
            </div>
          </div>
        </div>

        {/* Stylized Mat Layout */}
        <div className="relative mx-auto max-w-4xl rounded-2xl border border-[#363739] bg-[#111214] p-6 overflow-hidden">
          {/* Mat subtle texture grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#363739_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
          
          {/* Center alignment guide line */}
          <div className="absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 border-l border-dashed border-[#363739]" />

          <div className="relative grid grid-cols-2 gap-8 md:gap-16 py-4">
            
            {/* Left Channel */}
            <div className="flex flex-col items-center space-y-8">
              <span className="text-xs font-mono text-[#6a6b6c] uppercase">Left Mat Track</span>

              {/* Front Left */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-14 w-28 items-center justify-center rounded-xl border border-[#363739] bg-[#07080a] key-shadow transition-all duration-300"
                  style={{
                    boxShadow: toPercent(data.front.fsr1) > 20
                      ? `0 0 20px -2px rgba(255, 99, 99, ${toPercent(data.front.fsr1) / 100})`
                      : undefined
                  }}>
                  <div className="text-center">
                    <p className="text-[10px] text-[#6a6b6c]">Front-L (FSR 1)</p>
                    <p className={`font-mono text-sm font-bold ${textColour(toPercent(data.front.fsr1))}`}>
                      {toPercent(data.front.fsr1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle Left */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-14 w-28 items-center justify-center rounded-xl border border-[#363739] bg-[#07080a] key-shadow transition-all duration-300"
                  style={{
                    boxShadow: toPercent(data.middle.fsr1) > 20
                      ? `0 0 20px -2px rgba(255, 99, 99, ${toPercent(data.middle.fsr1) / 100})`
                      : undefined
                  }}>
                  <div className="text-center">
                    <p className="text-[10px] text-[#6a6b6c]">Middle-L (FSR 1)</p>
                    <p className={`font-mono text-sm font-bold ${textColour(toPercent(data.middle.fsr1))}`}>
                      {toPercent(data.middle.fsr1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Back Left */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-14 w-28 items-center justify-center rounded-xl border border-[#363739] bg-[#07080a] key-shadow transition-all duration-300"
                  style={{
                    boxShadow: toPercent(data.back.fsr1) > 20
                      ? `0 0 20px -2px rgba(255, 99, 99, ${toPercent(data.back.fsr1) / 100})`
                      : undefined
                  }}>
                  <div className="text-center">
                    <p className="text-[10px] text-[#6a6b6c]">Back-L (FSR 1)</p>
                    <p className={`font-mono text-sm font-bold ${textColour(toPercent(data.back.fsr1))}`}>
                      {toPercent(data.back.fsr1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Channel */}
            <div className="flex flex-col items-center space-y-8">
              <span className="text-xs font-mono text-[#6a6b6c] uppercase">Right Mat Track</span>

              {/* Front Right */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-14 w-28 items-center justify-center rounded-xl border border-[#363739] bg-[#07080a] key-shadow transition-all duration-300"
                  style={{
                    boxShadow: toPercent(data.front.fsr2) > 20
                      ? `0 0 20px -2px rgba(99, 161, 255, ${toPercent(data.front.fsr2) / 100})`
                      : undefined
                  }}>
                  <div className="text-center">
                    <p className="text-[10px] text-[#6a6b6c]">Front-R (FSR 2)</p>
                    <p className={`font-mono text-sm font-bold ${textColour(toPercent(data.front.fsr2))}`}>
                      {toPercent(data.front.fsr2)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle Right */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-14 w-28 items-center justify-center rounded-xl border border-[#363739] bg-[#07080a] key-shadow transition-all duration-300"
                  style={{
                    boxShadow: toPercent(data.middle.fsr2) > 20
                      ? `0 0 20px -2px rgba(99, 161, 255, ${toPercent(data.middle.fsr2) / 100})`
                      : undefined
                  }}>
                  <div className="text-center">
                    <p className="text-[10px] text-[#6a6b6c]">Middle-R (FSR 2)</p>
                    <p className={`font-mono text-sm font-bold ${textColour(toPercent(data.middle.fsr2))}`}>
                      {toPercent(data.middle.fsr2)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Back Right */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-14 w-28 items-center justify-center rounded-xl border border-[#363739] bg-[#07080a] key-shadow transition-all duration-300"
                  style={{
                    boxShadow: toPercent(data.back.fsr2) > 20
                      ? `0 0 20px -2px rgba(99, 161, 255, ${toPercent(data.back.fsr2) / 100})`
                      : undefined
                  }}>
                  <div className="text-center">
                    <p className="text-[10px] text-[#6a6b6c]">Back-R (FSR 2)</p>
                    <p className={`font-mono text-sm font-bold ${textColour(toPercent(data.back.fsr2))}`}>
                      {toPercent(data.back.fsr2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── 3 Region Cards ── */}
      <div className="grid gap-6 md:grid-cols-3">
        <RegionCard title="Front / Forefoot" icon="⚡" data={data.front} />
        <RegionCard title="Middle / Arch"     icon="⚖️" data={data.middle} />
        <RegionCard title="Back / Heel"       icon="⚓" data={data.back} />
      </div>

      {/* Technical Footnote */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-[#363739]/60 bg-[#111214]/60 px-5 py-3.5 text-xs text-[#9c9c9d]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#ff6363]">ESP32 · Firebase Realtime DB</span>
          <span>·</span>
          <span>Sampling Rate: 20 Hz (50ms interval)</span>
        </div>
        <div className="font-mono text-[11px] text-[#6a6b6c]">
          ADC Resolution: 10-bit (0–1023)
        </div>
      </div>

    </div>
  )
}
