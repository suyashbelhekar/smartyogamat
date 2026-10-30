import type { Landmark } from './drawPose'
import { LM, type PoseClassId, POSE_META } from './landmarks'
import type { BalanceMetrics, PersonalizedSuggestion, JointFaultSummary } from '../types/session'

export interface FrameBalanceResult {
  weightLeft: number // 0-100%
  weightRight: number // 0-100%
  instantScore: number // 0-100
  swayDistance: number
}

export class MatBalanceTracker {
  private prevComX = 0
  private prevComY = 0
  private initialized = false
  private swayHistory: number[] = []
  private weightHistory: number[] = [] // left weight percentages
  private scoreHistory: number[] = []

  public reset() {
    this.prevComX = 0
    this.prevComY = 0
    this.initialized = false
    this.swayHistory = []
    this.weightHistory = []
    this.scoreHistory = []
  }

  public processFrame(
    landmarks: Landmark[],
    poseId: PoseClassId | null,
  ): FrameBalanceResult {
    if (!landmarks || landmarks.length < 33) {
      return { weightLeft: 50, weightRight: 50, instantScore: 70, swayDistance: 0 }
    }

    const leftShoulder = landmarks[LM.LEFT_SHOULDER]
    const rightShoulder = landmarks[LM.RIGHT_SHOULDER]
    const leftHip = landmarks[LM.LEFT_HIP]
    const rightHip = landmarks[LM.RIGHT_HIP]
    const leftAnkle = landmarks[LM.LEFT_ANKLE]
    const rightAnkle = landmarks[LM.RIGHT_ANKLE]

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return { weightLeft: 50, weightRight: 50, instantScore: 70, swayDistance: 0 }
    }

    // Estimate Center of Mass (CoM) from upper body & pelvic core
    const comX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4
    const comY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4

    // Compute frame-to-frame Center of Balance sway
    let sway = 0
    if (this.initialized) {
      sway = Math.hypot(comX - this.prevComX, comY - this.prevComY)
    } else {
      this.initialized = true
    }
    this.prevComX = comX
    this.prevComY = comY

    // Smooth sway window (last 15 frames)
    this.swayHistory.push(sway)
    if (this.swayHistory.length > 20) this.swayHistory.shift()
    const avgSway = this.swayHistory.reduce((a, b) => a + b, 0) / this.swayHistory.length

    // Analyze base of support contact depending on pose group
    const meta = poseId ? POSE_META[poseId] : null
    const isStanding = meta ? meta.group === 'standing' : true

    let weightLeft = 50
    let weightRight = 50
    let alignmentBalance = 0.85

    if (isStanding && leftAnkle && rightAnkle) {
      // Calculate lateral base of support
      const leftFootX = leftAnkle.x
      const rightFootX = rightAnkle.x
      const baseSpan = Math.abs(rightFootX - leftFootX)

      if (baseSpan > 0.04) {
        // Distance of CoM to each foot
        const distToLeft = Math.abs(comX - leftFootX)
        const distToRight = Math.abs(comX - rightFootX)
        const totalDist = distToLeft + distToRight

        if (totalDist > 0.001) {
          // Closer to foot = more weight borne by that foot
          // In video mirroring, left is user's physical left side
          const rawLeftPct = (distToRight / totalDist) * 100
          weightLeft = Math.round(Math.max(15, Math.min(85, rawLeftPct)))
          weightRight = 100 - weightLeft
        }

        // Symmetry score — single-leg poses vs symmetric poses
        if (poseId === 'tree') {
          // Single-leg balance: one leg bears most weight
          alignmentBalance = 0.90
        } else {
          // Symmetric poses: ideal 50/50 distribution
          const deviationFrom50 = Math.abs(weightLeft - 50)
          alignmentBalance = Math.max(0.5, 1 - deviationFrom50 * 0.015)
        }
      } else {
        // Narrow base: check hip level balance
        const hipTilt = Math.abs(leftHip.y - rightHip.y)
        alignmentBalance = Math.max(0.6, 1 - hipTilt * 3)
      }
    } else {
      // Sitting poses: sit-bone pressure estimated via pelvic and shoulder tilt
      const hipTilt = Math.abs(leftHip.y - rightHip.y)
      const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y)
      const tiltError = (hipTilt + shoulderTilt) / 2
      alignmentBalance = Math.max(0.65, 1 - tiltError * 2.5)

      // Slight lateral skew derived from hip tilt
      const skew = Math.round((leftHip.y - rightHip.y) * 150)
      weightLeft = Math.max(35, Math.min(65, 50 - skew))
      weightRight = 100 - weightLeft
    }

    // Sway stability penalty (typical normalized sway between 0.001 and 0.035)
    // Low sway (<0.004) -> 0.95+ stability; High jitter (>0.02) -> drops to 0.55
    const swayStability = Math.max(0.4, 1 - Math.min(1, avgSway * 38))

    // Combined instantaneous smart mat balance score (0-100)
    const composite = (alignmentBalance * 0.45 + swayStability * 0.55) * 100
    const instantScore = Math.round(Math.max(30, Math.min(99, composite)))

    this.weightHistory.push(weightLeft)
    if (this.weightHistory.length > 300) this.weightHistory.shift()

    this.scoreHistory.push(instantScore)
    if (this.scoreHistory.length > 300) this.scoreHistory.shift()

    return {
      weightLeft,
      weightRight,
      instantScore,
      swayDistance: avgSway,
    }
  }

  public getSessionMetrics(): BalanceMetrics {
    const avgScore =
      this.scoreHistory.length > 0
        ? Math.round(this.scoreHistory.reduce((a, b) => a + b, 0) / this.scoreHistory.length)
        : 82

    const avgLeft =
      this.weightHistory.length > 0
        ? Math.round(this.weightHistory.reduce((a, b) => a + b, 0) / this.weightHistory.length)
        : 50
    const avgRight = 100 - avgLeft

    const avgSway =
      this.swayHistory.length > 0
        ? this.swayHistory.reduce((a, b) => a + b, 0) / this.swayHistory.length
        : 0.008

    // Sway index: scaled to 0-100 (lower means steadier)
    const swayIndex = Math.round(Math.min(100, avgSway * 1800))

    let stabilityRating: BalanceMetrics['stabilityRating'] = 'Good'
    if (avgScore >= 88) stabilityRating = 'Excellent'
    else if (avgScore >= 75) stabilityRating = 'Good'
    else if (avgScore >= 62) stabilityRating = 'Moderate'
    else stabilityRating = 'Needs Work'

    return {
      weightDistributionLeft: avgLeft,
      weightDistributionRight: avgRight,
      stabilityScore: avgScore,
      stabilityRating,
      swayIndex,
    }
  }
}

/**
 * Generate highly personalized improvement suggestions based on actual session data.
 */
export function generateSessionSuggestions(
  poseId: PoseClassId,
  cameraAccuracy: number,
  balance: BalanceMetrics,
  topFaults: JointFaultSummary[],
  durationSec: number,
  matchedTimeSec: number,
): PersonalizedSuggestion[] {
  const meta = POSE_META[poseId]
  const suggestions: PersonalizedSuggestion[] = []

  // 1. Joint-specific alignment suggestions from actual faults detected
  if (topFaults.length > 0) {
    const primary = topFaults[0]
    const faultName = primary.jointNameEn.toLowerCase()

    if (faultName.includes('knee')) {
      suggestions.push({
        en: `Refine your ${primary.jointNameEn}: ${primary.sampleCueEn}. Keep knee stacked steadily over ankle (avg deviation ±${primary.avgDeviationDeg}°).`,
        mr: `तुमच्या ${primary.jointNameMr}वर लक्ष केंद्रित करा: ${primary.sampleCueMr} (सरासरी फरक ±${primary.avgDeviationDeg}°).`,
        category: 'alignment',
      })
    } else if (faultName.includes('torso') || faultName.includes('spine')) {
      suggestions.push({
        en: `Spinal elongation: ${primary.sampleCueEn}. Maintain an upright crown without collapsing into the lower back.`,
        mr: `पाठीचा कणा ताठ ठेवा: ${primary.sampleCueMr}. कमरेवर अनावश्यक ताण न देता छाती खुली ठेवा.`,
        category: 'alignment',
      })
    } else if (faultName.includes('arm') || faultName.includes('elbow') || faultName.includes('shoulder')) {
      suggestions.push({
        en: `Arm positioning: ${primary.sampleCueEn}. Relax your shoulders away from your ears to reduce upper tension.`,
        mr: `हातांची योग्य मुद्रा: ${primary.sampleCueMr}. खांदे सैल ठेवून मान मोकळी ठेवा.`,
        category: 'alignment',
      })
    } else if (faultName.includes('hip')) {
      suggestions.push({
        en: `Pelvic alignment: ${primary.sampleCueEn}. Square your hips steadily towards your foundation.`,
        mr: `कंबरेचे संतुलन: ${primary.sampleCueMr}. दोन्ही नितंब समान पातळीवर संतुलित ठेवा.`,
        category: 'alignment',
      })
    } else {
      suggestions.push({
        en: `Form adjustment: ${primary.sampleCueEn} (target error ±${primary.avgDeviationDeg}°).`,
        mr: `मुद्रा सुधारणा: ${primary.sampleCueMr} (फरक ±${primary.avgDeviationDeg}°).`,
        category: 'alignment',
      })
    }

    if (topFaults.length > 1) {
      const secondary = topFaults[1]
      suggestions.push({
        en: `Secondary focus: ${secondary.sampleCueEn} (${secondary.jointNameEn}).`,
        mr: `दुसरी सुधारणा: ${secondary.sampleCueMr} (${secondary.jointNameMr}).`,
        category: 'alignment',
      })
    }
  }

  // 2. Smart Mat Balance Suggestions based on weight distribution and sway
  const asymmetry = Math.abs(balance.weightDistributionLeft - 50)
  if (asymmetry > 12 && poseId !== 'tree') {
    if (balance.weightDistributionLeft > balance.weightDistributionRight) {
      suggestions.push({
        en: `Smart Mat Balance: Detected ${balance.weightDistributionLeft}% weight on your left side. Press firmly into your right foot/sit-bone to distribute pressure evenly on the mat.`,
        mr: `स्मार्ट मॅट तोल: तुमच्या डाव्या बाजूवर ${balance.weightDistributionLeft}% अधिक भार पडला. उजव्या पायावरही समान भार देऊन मॅटवर समतोल साधा.`,
        category: 'balance',
      })
    } else {
      suggestions.push({
        en: `Smart Mat Balance: Detected ${balance.weightDistributionRight}% weight biased to the right. Ground through the inner arch and heel of your left foot.`,
        mr: `स्मार्ट मॅट तोल: उजव्या बाजूवर ${balance.weightDistributionRight}% अधिक भार जाणवला. डाव्या पायाच्या टाचेवर योग्य दाब देऊन तोल सांभाळा.`,
        category: 'balance',
      })
    }
  } else if (balance.swayIndex > 45) {
    suggestions.push({
      en: `Balance Stability: Minor tremor and sway detected on the mat. Fix your gaze on an unmoving drishti point and engage your core to lock stability.`,
      mr: `तोल स्थिरता: मॅटवर शरीराचा काहीसा थरकाप जाणवला. समोरील एका स्थिर बिंदूवर दृष्टी (दृष्टीबिंदू) खिळवून ठेवा आणि पोटाचे स्नायू घट्ट करा.`,
      category: 'balance',
    })
  } else {
    suggestions.push({
      en: `Mat Grounding: Excellent base stability (${balance.stabilityScore}%) with balanced ground contact across your foundation.`,
      mr: `मॅटवरील पकड: उत्तम पाया स्थिरता (${balance.stabilityScore}%) सह तुमचे मॅटवरील संतुलन उत्कृष्ट राहिले.`,
      category: 'praise',
    })
  }

  // 3. Duration & Hold Time Coaching
  if (durationSec < 15) {
    suggestions.push({
      en: `Practice pacing: Try holding ${meta.name} for at least 20-30 seconds to build deep muscle memory and joint endurance.`,
      mr: `सराव वेळ: स्नायूंची ताकद व स्थिरता वाढवण्यासाठी ${meta.name} किमान २० ते ३० सेकंद धरून ठेवण्याचा प्रयत्न करा.`,
      category: 'breathing',
    })
  } else if (matchedTimeSec / durationSec >= 0.7 && cameraAccuracy >= 80) {
    suggestions.push({
      en: `Mastery praise: You maintained locked form for ${Math.round((matchedTimeSec / durationSec) * 100)}% of your session! Ready to progress to longer meditation holds.`,
      mr: `प्रशंसा: तुम्ही सत्रातील ${Math.round((matchedTimeSec / durationSec) * 100)}% वेळ परिपूर्ण मुद्रेत टिकून राहिलात! आसन दीर्घकाळ धरून ठेवण्याची क्षमता वाढत आहे.`,
      category: 'praise',
    })
  } else {
    suggestions.push({
      en: `Breathing rhythm: Inhale deeply to expand your ribs, and exhale smoothly while sinking grounded into the posture.`,
      mr: `श्वसन लय: दीर्घ श्वास घेऊन छाती प्रसरण पावा, आणि श्वास सोडताना मुद्रेमध्ये शांतपणे स्थिर व्हा.`,
      category: 'breathing',
    })
  }

  return suggestions
}
