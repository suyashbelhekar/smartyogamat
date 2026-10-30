import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { Landmark } from '../lib/drawPose'
import { vec3, type Vec3 } from '../lib/vec3'

const WASM_URL = '/mediapipe/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

export type DetectedPose = {
  normalized: Landmark[]
  metric: Vec3[]
}

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null
  private lastTimestamp = 0
  private prevNormalized: Landmark[] | null = null

  async init(): Promise<void> {
    if (this.landmarker) return
    const vision = await FilesetResolver.forVisionTasks(WASM_URL)
    const options = {
      runningMode: 'VIDEO' as const,
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      })
    } catch {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      })
    }
  }

  detect(video: HTMLVideoElement, timestampMs: number): DetectedPose | null {
    if (!this.landmarker || video.readyState < 2) return null
    const ts = Math.max(timestampMs, this.lastTimestamp + 1)
    this.lastTimestamp = ts
    const result = this.landmarker.detectForVideo(video, ts)
    const pose = result.landmarks[0]
    if (!pose) {
      this.prevNormalized = null
      return null
    }

    const width = video.videoWidth || 1
    const height = video.videoHeight || 1

    const rawNormalized: Landmark[] = pose.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      visibility: p.visibility,
    }))

    // Multi-tier Adaptive Smoothing:
    // When the user holds still, heavily filter out camera noise.
    // When the user moves, track responsively with minimal latency.
    let smoothedNormalized: Landmark[]
    if (!this.prevNormalized || this.prevNormalized.length !== rawNormalized.length) {
      smoothedNormalized = rawNormalized
    } else {
      smoothedNormalized = rawNormalized.map((curr, i) => {
        const prev = this.prevNormalized![i]
        const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y)
        let alpha = 0.12 // Default ultra-smooth alpha for still pose holding
        if (dist > 0.06) {
          alpha = 0.88 // Fast intentional movement
        } else if (dist > 0.02) {
          alpha = 0.60 // Moderate movement
        } else if (dist > 0.008) {
          alpha = 0.32 // Minor adjustment
        }
        return {
          x: prev.x * (1 - alpha) + curr.x * alpha,
          y: prev.y * (1 - alpha) + curr.y * alpha,
          z: (prev.z ?? 0) * (1 - alpha) + (curr.z ?? 0) * alpha,
          visibility: (prev.visibility ?? 1) * 0.75 + (curr.visibility ?? 1) * 0.25,
        }
      })
    }
    this.prevNormalized = smoothedNormalized

    return {
      normalized: smoothedNormalized,
      metric: smoothedNormalized.map((p) =>
        vec3(p.x * width, p.y * height, (p.z ?? 0) * width),
      ),
    }
  }

  close() {
    this.landmarker?.close()
    this.landmarker = null
    this.lastTimestamp = 0
    this.prevNormalized = null
  }
}
