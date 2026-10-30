import { useState } from 'react'

export interface ChartDataPoint {
  label: string
  cameraAccuracy: number
  matBalance: number
  combinedScore: number
  sublabel?: string
}

interface ProgressChartProps {
  data: ChartDataPoint[]
  height?: number
}

export function ProgressChart({ data, height = 240 }: ProgressChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [showCamera, setShowCamera] = useState(true)
  const [showMat, setShowMat] = useState(true)
  const [showCombined, setShowCombined] = useState(true)

  if (data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-[#363739] bg-[#07080a]/60 text-xs text-[#9c9c9d]">
        No progress data recorded yet. Complete camera sessions to generate your trend chart.
      </div>
    )
  }

  const chartWidth = 640
  const chartHeight = height
  const paddingLeft = 46
  const paddingRight = 24
  const paddingTop = 24
  const paddingBottom = 48

  const plotWidth = chartWidth - paddingLeft - paddingRight
  const plotHeight = chartHeight - paddingTop - paddingBottom

  const getX = (index: number) => {
    if (data.length === 1) return paddingLeft + plotWidth / 2
    return paddingLeft + (index / (data.length - 1)) * plotWidth
  }

  const getY = (val: number) => {
    const num = Number(val)
    const clamped = Math.max(0, Math.min(100, isNaN(num) ? 0 : num))
    return paddingTop + (1 - clamped / 100) * plotHeight
  }

  const createPath = (key: 'cameraAccuracy' | 'matBalance' | 'combinedScore') => {
    if (data.length === 1) return ''
    return data
      .map((d, i) => {
        const x = getX(i)
        const y = getY(d[key])
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }

  const createAreaPath = (key: 'cameraAccuracy' | 'matBalance' | 'combinedScore') => {
    if (data.length <= 1) return ''
    const line = createPath(key)
    if (!line) return ''
    const lastX = getX(data.length - 1)
    const firstX = getX(0)
    const bottomY = paddingTop + plotHeight
    return `${line} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`
  }

  const yTicks = [0, 25, 50, 75, 100]

  const shortLabel = (raw: string) => {
    const weekMatch = raw.match(/Week\s+(\d+)\s+\((.+)\)/)
    if (weekMatch) return `W${weekMatch[1]} ${weekMatch[2]}`
    return raw
  }

  const getTooltipLeft = (idx: number) => {
    const rawPct = (getX(idx) / chartWidth) * 100
    return Math.max(12, Math.min(rawPct, 77))
  }

  return (
    <div className="relative flex flex-col">
      {/* Legend & Filter Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCombined(!showCombined)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all ${
              showCombined
                ? 'bg-[#452324] text-[#ff6363] border border-[#ff6363]/40'
                : 'text-[#6a6b6c] hover:text-[#9c9c9d] border border-transparent'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-[#ff6363]" />
            <span>Combined Score</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCamera(!showCamera)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all ${
              showCamera
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                : 'text-[#6a6b6c] hover:text-[#9c9c9d] border border-transparent'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Camera Accuracy</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMat(!showMat)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all ${
              showMat
                ? 'bg-sky-950/60 text-sky-400 border border-sky-500/40'
                : 'text-[#6a6b6c] hover:text-[#9c9c9d] border border-transparent'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <span>Smart Mat Balance</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-[#6a6b6c]">Hover points for session details</span>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden rounded-xl border border-[#363739] bg-[#07080a] p-3 key-shadow">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="combinedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6363" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ff6363" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="cameraGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#59d499" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#59d499" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="matGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#63a1ff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#63a1ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y labels */}
          {yTicks.map((tick) => {
            const y = getY(tick)
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#1b1c1e"
                  strokeDasharray={tick === 0 || tick === 100 ? undefined : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#6a6b6c"
                  className="font-mono font-medium"
                >
                  {tick}%
                </text>
              </g>
            )
          })}

          {/* Area fills */}
          {showCombined && data.length > 1 && (
            <path d={createAreaPath('combinedScore')} fill="url(#combinedGrad)" />
          )}

          {/* Lines */}
          {showCamera && data.length > 1 && (
            <path
              d={createPath('cameraAccuracy')}
              fill="none"
              stroke="#59d499"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {showMat && data.length > 1 && (
            <path
              d={createPath('matBalance')}
              fill="none"
              stroke="#63a1ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {showCombined && data.length > 1 && (
            <path
              d={createPath('combinedScore')}
              fill="none"
              stroke="#ff6363"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X axis labels and vertical hover guide */}
          {data.map((d, i) => {
            const x = getX(i)
            const isHovered = hoveredIdx === i
            const label = shortLabel(d.label)

            return (
              <g key={d.label + i}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + plotHeight}
                    stroke="#ff6363"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* X label */}
                <text
                  x={x}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  fontSize={data.length > 10 ? '9' : '11'}
                  fill={isHovered ? '#ffffff' : '#9c9c9d'}
                  fontWeight={isHovered ? '600' : '400'}
                  transform={data.length > 7 ? `rotate(-30, ${x}, ${chartHeight - 10})` : undefined}
                >
                  {label}
                </text>

                {/* Data Points */}
                {showCamera && (
                  <circle
                    cx={x}
                    cy={getY(d.cameraAccuracy)}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#07080a"
                    stroke="#59d499"
                    strokeWidth="2.5"
                    className="transition-all"
                  />
                )}

                {showMat && (
                  <circle
                    cx={x}
                    cy={getY(d.matBalance)}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#07080a"
                    stroke="#63a1ff"
                    strokeWidth="2.5"
                    className="transition-all"
                  />
                )}

                {showCombined && (
                  <circle
                    cx={x}
                    cy={getY(d.combinedScore)}
                    r={isHovered ? 6.5 : 4.5}
                    fill="#ff6363"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all shadow-sm"
                  />
                )}

                {/* Transparent hover target */}
                <rect
                  x={x - 20}
                  y={paddingTop}
                  width="40"
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                />
              </g>
            )
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 rounded-lg border border-[#363739] bg-[#111214]/95 px-3 py-2 text-white shadow-2xl backdrop-blur-md transition-all key-shadow"
            style={{
              left: `${getTooltipLeft(hoveredIdx)}%`,
              top: '12px',
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#363739]/60 pb-1">
              <span className="text-xs font-semibold text-white">
                {data[hoveredIdx].label}
              </span>
              {data[hoveredIdx].sublabel && (
                <span className="text-[10px] font-mono text-[#9c9c9d]">
                  {data[hoveredIdx].sublabel}
                </span>
              )}
            </div>

            <div className="mt-1.5 space-y-1 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-[#ff6363]">
                  <span className="h-2 w-2 rounded-full bg-[#ff6363]" />
                  Combined:
                </span>
                <span className="font-bold tabular-nums">
                  {data[hoveredIdx].combinedScore}%
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Camera Pose:
                </span>
                <span className="font-medium tabular-nums">
                  {data[hoveredIdx].cameraAccuracy}%
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Mat Balance:
                </span>
                <span className="font-medium tabular-nums">
                  {data[hoveredIdx].matBalance}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
