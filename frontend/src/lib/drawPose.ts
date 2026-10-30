import { LM } from './landmarks'
import type { DetailedCue } from './coachCues'

export type Landmark = {
  x: number
  y: number
  z?: number
  visibility?: number
}

type Line = { a: number; b: number; color: string; limbKey?: string }

const WHITE = '#ffffff'
const LEFT = '#22c55e'
const RIGHT = '#eab308'

const LINES: Line[] = [
  { a: LM.NOSE, b: LM.LEFT_EYE_INNER, color: WHITE },
  { a: LM.LEFT_EYE_INNER, b: LM.LEFT_EYE, color: WHITE },
  { a: LM.LEFT_EYE, b: LM.LEFT_EYE_OUTER, color: WHITE },
  { a: LM.LEFT_EYE_OUTER, b: LM.LEFT_EAR, color: WHITE },
  { a: LM.NOSE, b: LM.RIGHT_EYE_INNER, color: WHITE },
  { a: LM.RIGHT_EYE_INNER, b: LM.RIGHT_EYE, color: WHITE },
  { a: LM.RIGHT_EYE, b: LM.RIGHT_EYE_OUTER, color: WHITE },
  { a: LM.RIGHT_EYE_OUTER, b: LM.RIGHT_EAR, color: WHITE },
  { a: LM.MOUTH_LEFT, b: LM.MOUTH_RIGHT, color: WHITE },
  { a: LM.LEFT_SHOULDER, b: LM.RIGHT_SHOULDER, color: WHITE },
  { a: LM.LEFT_HIP, b: LM.RIGHT_HIP, color: WHITE },
  { a: LM.LEFT_SHOULDER, b: LM.LEFT_ELBOW, color: LEFT, limbKey: 'leftShoulder' },
  { a: LM.LEFT_ELBOW, b: LM.LEFT_WRIST, color: LEFT, limbKey: 'leftElbow' },
  { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, color: LEFT, limbKey: 'leftHip' },
  { a: LM.LEFT_HIP, b: LM.LEFT_KNEE, color: LEFT, limbKey: 'leftKnee' },
  { a: LM.LEFT_KNEE, b: LM.LEFT_ANKLE, color: LEFT, limbKey: 'leftKnee' },
  { a: LM.LEFT_WRIST, b: LM.LEFT_THUMB, color: LEFT },
  { a: LM.LEFT_WRIST, b: LM.LEFT_PINKY, color: LEFT },
  { a: LM.LEFT_WRIST, b: LM.LEFT_INDEX, color: LEFT },
  { a: LM.LEFT_INDEX, b: LM.LEFT_PINKY, color: LEFT },
  { a: LM.LEFT_ANKLE, b: LM.LEFT_HEEL, color: LEFT },
  { a: LM.LEFT_HEEL, b: LM.LEFT_FOOT_INDEX, color: LEFT },
  { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_ELBOW, color: RIGHT, limbKey: 'rightShoulder' },
  { a: LM.RIGHT_ELBOW, b: LM.RIGHT_WRIST, color: RIGHT, limbKey: 'rightElbow' },
  { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_HIP, color: RIGHT, limbKey: 'rightHip' },
  { a: LM.RIGHT_HIP, b: LM.RIGHT_KNEE, color: RIGHT, limbKey: 'rightKnee' },
  { a: LM.RIGHT_KNEE, b: LM.RIGHT_ANKLE, color: RIGHT, limbKey: 'rightKnee' },
  { a: LM.RIGHT_WRIST, b: LM.RIGHT_THUMB, color: RIGHT },
  { a: LM.RIGHT_WRIST, b: LM.RIGHT_PINKY, color: RIGHT },
  { a: LM.RIGHT_WRIST, b: LM.RIGHT_INDEX, color: RIGHT },
  { a: LM.RIGHT_INDEX, b: LM.RIGHT_PINKY, color: RIGHT },
  { a: LM.RIGHT_ANKLE, b: LM.RIGHT_HEEL, color: RIGHT },
  { a: LM.RIGHT_HEEL, b: LM.RIGHT_FOOT_INDEX, color: RIGHT },
]

/** Inline 3-point joint angle calculation. */
function jointAngle(
  landmarks: Landmark[],
  points: [number, number, number],
  minVisibility = 0.15,
): number | null {
  const a = landmarks[points[0]]
  const b = landmarks[points[1]]
  const c = landmarks[points[2]]
  if (!a || !b || !c) return null
  if (
    (a.visibility ?? 1) < minVisibility ||
    (b.visibility ?? 1) < minVisibility ||
    (c.visibility ?? 1) < minVisibility
  ) {
    return null
  }

  const bax = a.x - b.x
  const bay = a.y - b.y
  const bcx = c.x - b.x
  const bcy = c.y - b.y
  const mag = Math.hypot(bax, bay) * Math.hypot(bcx, bcy)
  if (mag < 1e-6) return 0
  const cosine = Math.min(1, Math.max(-1, (bax * bcx + bay * bcy) / mag))
  return (Math.acos(cosine) * 180) / Math.PI
}

export function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[] | null,
  showAngles = true,
  matched = false,
  frozen = false,
  faults?: DetailedCue[],
  calibrating = false,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  if (!landmarks || landmarks.length < 11) return

  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const lineWidth = Math.max(4, width / 180)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = lineWidth

  // Glowing celebration / calibration effect
  if (calibrating) {
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 12
  } else if (frozen) {
    ctx.shadowColor = '#06b6d4'
    ctx.shadowBlur = 16
  } else if (matched) {
    ctx.shadowColor = '#10b981'
    ctx.shadowBlur = 14
  } else {
    ctx.shadowBlur = 0
  }

  const faultIds = new Set((faults ?? []).map((f) => f.id.toLowerCase()))

  for (const { a, b, color, limbKey } of LINES) {
    const pa = landmarks[a]
    const pb = landmarks[b]
    if (!visible(pa) || !visible(pb)) continue

    const isFaultLimb =
      !calibrating &&
      limbKey &&
      (faultIds.has(limbKey.toLowerCase()) ||
        (limbKey.includes('Knee') &&
          (faultIds.has('frontknee') ||
            faultIds.has('backknee') ||
            faultIds.has('standingknee') ||
            faultIds.has('liftedknee') ||
            faultIds.has('leftknee') ||
            faultIds.has('rightknee'))) ||
        (limbKey.includes('Elbow') &&
          (faultIds.has('leftelbow') || faultIds.has('rightelbow'))) ||
        (limbKey.includes('Shoulder') &&
          (faultIds.has('leftshoulder') || faultIds.has('rightshoulder'))) ||
        (limbKey.includes('Hip') &&
          (faultIds.has('lefthip') || faultIds.has('righthip') || faultIds.has('torsotilt'))))

    if (calibrating) {
      ctx.strokeStyle = '#38bdf8'
    } else if (frozen) {
      ctx.strokeStyle = '#38bdf8'
    } else if (matched) {
      ctx.strokeStyle = '#34d399'
    } else if (isFaultLimb) {
      ctx.strokeStyle = '#f43f5e'
    } else {
      ctx.strokeStyle = color
    }

    ctx.beginPath()
    ctx.moveTo(pa.x * width, pa.y * height)
    ctx.lineTo(pb.x * width, pb.y * height)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
  ctx.fillStyle = calibrating ? '#e0f2fe' : WHITE
  for (const point of landmarks) {
    if (!visible(point)) continue
    ctx.beginPath()
    ctx.arc(point.x * width, point.y * height, Math.max(3, width / 200), 0, Math.PI * 2)
    ctx.fill()
  }

  if (showAngles && landmarks.length >= 33) {
    const anglePoints = [
      {
        id: 'leftElbow',
        pts: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST] as [number, number, number],
        mid: LM.LEFT_ELBOW,
        color: LEFT,
      },
      {
        id: 'rightElbow',
        pts: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST] as [number, number, number],
        mid: LM.RIGHT_ELBOW,
        color: RIGHT,
      },
      {
        id: 'leftKnee',
        pts: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE] as [number, number, number],
        mid: LM.LEFT_KNEE,
        color: LEFT,
      },
      {
        id: 'rightKnee',
        pts: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE] as [number, number, number],
        mid: LM.RIGHT_KNEE,
        color: RIGHT,
      },
    ]

    const fontSize = Math.max(11, Math.min(16, Math.round(width / 52)))
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const item of anglePoints) {
      const angle = jointAngle(landmarks, item.pts)
      const p = landmarks[item.mid]
      if (angle == null || !visible(p)) continue
      const px = p.x * width
      const py = p.y * height

      const hasFault =
        !calibrating &&
        (faults ?? []).some(
          (f) =>
            f.id.toLowerCase() === item.id.toLowerCase() ||
            (item.id.includes('Knee') && f.id.toLowerCase().includes('knee')) ||
            (item.id.includes('Elbow') && f.id.toLowerCase().includes('elbow')),
        )

      const text = `${Math.round(angle)}°`

      ctx.save()
      ctx.translate(px, py)
      ctx.scale(-1, 1)

      const textWidth = ctx.measureText(text).width
      const padX = 6
      const padY = 3
      const boxW = textWidth + padX * 2
      const boxH = fontSize + padY * 2

      ctx.fillStyle = calibrating
        ? 'rgba(12, 74, 110, 0.9)'
        : hasFault
          ? 'rgba(225, 29, 72, 0.95)'
          : matched
            ? 'rgba(5, 150, 105, 0.9)'
            : 'rgba(15, 23, 42, 0.85)'

      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 4)
        ctx.fill()
        ctx.strokeStyle = calibrating
          ? '#38bdf8'
          : hasFault
            ? '#fda4af'
            : matched
              ? '#6ee7b7'
              : item.color
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH)
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }
  }
}

function visible(point: Landmark | undefined): point is Landmark {
  return point != null && (point.visibility ?? 1) > 0.3
}
