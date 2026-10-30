/**
 * mlClassifier.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Loads weights.json (exported by train_tfjs.py) and runs the MLP forward
 * pass in pure TypeScript — no TF.js required, zero compatibility issues.
 *
 * Architecture (inference-time, Dropout inactive):
 *   Input(132) → BatchNorm → Dense(256, relu) → Dense(128, relu)
 *              → Dense(64, relu) → Dense(5, softmax)
 *
 * Normalisation (must match Python training):
 *   • Translate all landmarks so hip midpoint = origin
 *   • Scale by torso height (shoulder-mid → left-hip distance)
 *   • Flatten [x, y, z, visibility] × 33 → Float32(132)
 */

import type { Landmark } from './drawPose'
import { emptyScores, POSE_CLASSES, POSE_META, type PoseClassId } from './landmarks'

const LEFT_HIP       = 23
const RIGHT_HIP      = 24
const LEFT_SHOULDER  = 11
const RIGHT_SHOULDER = 12

const WEIGHTS_URL = '/pose_model/weights.json'

// Build reverse map: modelClass (Sanskrit) → PoseClassId
const MODEL_CLASS_TO_ID: Record<string, PoseClassId> = Object.fromEntries(
  POSE_CLASSES.map((id) => [POSE_META[id].modelClass, id])
)

// ── types matching the JSON export ───────────────────────────────────────────
type BnLayer = {
  type: 'batchnorm'
  gamma: number[]
  beta: number[]
  mean: number[]
  variance: number[]
  epsilon: number
}
type DenseLayer = {
  type: 'dense'
  activation: 'relu' | 'softmax' | string
  kernel: number[][]   // [in, out]
  bias: number[]       // [out]
}
type LayerSpec = BnLayer | DenseLayer

type WeightsJson = {
  inputDim: number
  outputDim: number
  classes: string[]
  layers: LayerSpec[]
}

// ── feature extraction ────────────────────────────────────────────────────────
function buildFeatureVector(landmarks: Landmark[]): Float32Array {
  const out = new Float32Array(132)
  if (landmarks.length < 33) return out

  const lhx = landmarks[LEFT_HIP].x,       lhy = landmarks[LEFT_HIP].y,       lhz = landmarks[LEFT_HIP].z ?? 0
  const rhx = landmarks[RIGHT_HIP].x,      rhy = landmarks[RIGHT_HIP].y,      rhz = landmarks[RIGHT_HIP].z ?? 0
  const lsx = landmarks[LEFT_SHOULDER].x,  lsy = landmarks[LEFT_SHOULDER].y,  lsz = landmarks[LEFT_SHOULDER].z ?? 0
  const rsx = landmarks[RIGHT_SHOULDER].x, rsy = landmarks[RIGHT_SHOULDER].y, rsz = landmarks[RIGHT_SHOULDER].z ?? 0

  const hipX = (lhx + rhx) / 2, hipY = (lhy + rhy) / 2, hipZ = (lhz + rhz) / 2
  const shX  = (lsx + rsx) / 2, shY  = (lsy + rsy) / 2, shZ  = (lsz + rsz) / 2

  const dx = shX - lhx, dy = shY - lhy, dz = shZ - lhz
  const scale = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 1e-6)

  for (let i = 0; i < 33; i++) {
    const lm   = landmarks[i]
    const base = i * 4
    out[base]     = ((lm.x ?? 0) - hipX) / scale
    out[base + 1] = ((lm.y ?? 0) - hipY) / scale
    out[base + 2] = ((lm.z ?? 0) - hipZ) / scale
    out[base + 3] = lm.visibility ?? 1
  }
  return out
}

// ── forward pass helpers ──────────────────────────────────────────────────────
function applyBatchNorm(x: Float32Array, layer: BnLayer): Float32Array {
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) {
    const xhat = (x[i] - layer.mean[i]) / Math.sqrt(layer.variance[i] + layer.epsilon)
    out[i] = layer.gamma[i] * xhat + layer.beta[i]
  }
  return out
}

function applyDense(x: Float32Array, layer: DenseLayer): Float32Array {
  const inDim  = layer.kernel.length
  const outDim = layer.bias.length
  const out    = new Float32Array(outDim)

  for (let j = 0; j < outDim; j++) {
    let sum = layer.bias[j]
    for (let i = 0; i < inDim; i++) {
      sum += x[i] * layer.kernel[i][j]
    }
    if (layer.activation === 'relu') {
      out[j] = sum > 0 ? sum : 0
    } else {
      out[j] = sum  // softmax applied afterwards
    }
  }

  if (layer.activation === 'softmax') {
    const max = Math.max(...out)
    let sum = 0
    for (let j = 0; j < outDim; j++) { out[j] = Math.exp(out[j] - max); sum += out[j] }
    for (let j = 0; j < outDim; j++) { out[j] /= sum }
  }

  return out
}

// ── classifier class ──────────────────────────────────────────────────────────
export type ClassifyResult = {
  scores: Record<PoseClassId, number>
  label:  PoseClassId | null
  confidence: number
}

export class MlPoseClassifier {
  private layers:  LayerSpec[]   = []
  /** Ordered list of PoseClassId values matching the weights.json output indices */
  private idOrder: PoseClassId[] = []
  private loading  = false
  private loadError: string | null  = null

  get isReady():  boolean       { return this.layers.length > 0 }
  get error():    string | null { return this.loadError }

  async load(): Promise<void> {
    if (this.isReady || this.loading) return
    this.loading   = true
    this.loadError = null
    try {
      const res = await fetch(WEIGHTS_URL)
      if (!res.ok) throw new Error(`weights.json fetch failed: ${res.status}`)
      const json = await res.json() as WeightsJson

      // Map each Sanskrit class name → PoseClassId
      this.idOrder = json.classes.map((cls) => {
        const id = MODEL_CLASS_TO_ID[cls]
        if (!id) throw new Error(`Unknown model class: "${cls}"`)
        return id
      })
      this.layers = json.layers
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err)
    } finally {
      this.loading = false
    }
  }

  classify(landmarks: Landmark[]): ClassifyResult {
    const empty: ClassifyResult = { scores: emptyScores(), label: null, confidence: 0 }
    if (!this.isReady || this.idOrder.length === 0) return empty

    let x = buildFeatureVector(landmarks)

    for (const layer of this.layers) {
      if (layer.type === 'batchnorm') {
        x = applyBatchNorm(x, layer)
      } else if (layer.type === 'dense') {
        x = applyDense(x, layer)
      }
    }

    const scores  = emptyScores()
    let best: PoseClassId | null = null
    let bestProb  = 0

    for (let i = 0; i < this.idOrder.length; i++) {
      const id = this.idOrder[i]
      const p  = x[i] ?? 0
      scores[id] = p
      if (p > bestProb) { bestProb = p; best = id }
    }

    return {
      scores,
      label:      bestProb >= 0.40 ? best : null,
      confidence: bestProb,
    }
  }

  // No-op — pure TS, nothing to dispose
  dispose(): void {}
}
