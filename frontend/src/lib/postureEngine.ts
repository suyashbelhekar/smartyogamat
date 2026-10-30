/**
 * postureEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time Biomechanical Pose Alignment, Joint Angle Analysis, Mistake
 * Detection, and Posture Correction Engine for SmartYoga AI.
 *
 * Implements continuous, mathematically grounded posture comparison against
 * true reference biomechanics for the 5 supported poses:
 *   1. downdog   (Downward-Facing Dog / Adho Mukha Svanasana)
 *   2. goddess   (Goddess Pose / Utkata Konasana)
 *   3. plank     (Plank Pose / Phalakasana)
 *   4. tree      (Tree Pose / Vrksasana)
 *   5. warrior2  (Warrior II / Virabhadrasana II)
 *
 * Computes exact joint angles, deviations, directional correction instructions,
 * and tracks real-time mistakes & corrections performed.
 */

import { LM, type PoseClassId } from './landmarks'
import type { Landmark } from './drawPose'
import type { DetailedCue } from './coachCues'
import type { JointFaultSummary } from '../types/session'

// ── Math & Geometry Helpers ──────────────────────────────────────────────────

export function calculateJointAngle(
  a: Landmark | undefined,
  b: Landmark | undefined,
  c: Landmark | undefined,
  minVisibility = 0.25,
): number | null {
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
  const cos = Math.min(1, Math.max(-1, (bax * bcx + bay * bcy) / mag))
  return (Math.acos(cos) * 180) / Math.PI
}

export function calculateTorsoTilt(
  ls: Landmark | undefined,
  rs: Landmark | undefined,
  lh: Landmark | undefined,
  rh: Landmark | undefined,
): number | null {
  if (!ls || !rs || !lh || !rh) return null
  if ((ls.visibility ?? 1) < 0.25 && (rs.visibility ?? 1) < 0.25) return null
  if ((lh.visibility ?? 1) < 0.25 && (rh.visibility ?? 1) < 0.25) return null

  const shX = (ls.x + rs.x) / 2
  const shY = (ls.y + rs.y) / 2
  const hipX = (lh.x + rh.x) / 2
  const hipY = (lh.y + rh.y) / 2

  const dx = shX - hipX
  const dy = shY - hipY // In screen space, shoulder is above hip (dy < 0)

  // Tilt in degrees from true vertical
  const rad = Math.atan2(Math.abs(dx), Math.abs(dy))
  return (rad * 180) / Math.PI
}

// ── Joint Rules & Posture Specifications ──────────────────────────────────────

export interface JointEvaluation {
  id: string
  nameEn: string
  nameMr: string
  limbKey?: string
  currentAngle: number
  targetMin: number
  targetMax: number
  idealAngle: number
  deviationDeg: number
  status: 'good' | 'warning' | 'fault'
  score: number // 0 to 1
  cueEn: string
  cueMr: string
}

export interface PostureEvaluationResult {
  poseId: PoseClassId
  accuracy: number // 0 to 100
  isMatched: boolean
  status: 'good' | 'okay' | 'off'
  faults: DetailedCue[]
  jointEvaluations: JointEvaluation[]
  primaryCueEn: string
  primaryCueMr: string
  alignmentDetails: {
    armsScore: number
    coreScore: number
    legsScore: number
  }
}

export interface ActiveMistake {
  id: string
  jointNameEn: string
  jointNameMr: string
  limbKey?: string
  deviationDeg: number
  cueEn: string
  cueMr: string
  firstDetectedAt: number
  lastUpdated: number
  durationMs: number
}

// ── Pose Evaluator ───────────────────────────────────────────────────────────

export function evaluatePoseAlignment(
  poseId: PoseClassId,
  landmarks: Landmark[] | null,
  mlConfidence = 0.5,
): PostureEvaluationResult {
  const emptyResult: PostureEvaluationResult = {
    poseId,
    accuracy: 0,
    isMatched: false,
    status: 'off',
    faults: [],
    jointEvaluations: [],
    primaryCueEn: 'Step clearly into camera view',
    primaryCueMr: 'कॅमेऱ्यासमोर स्पष्ट उभे रहा',
    alignmentDetails: { armsScore: 0, coreScore: 0, legsScore: 0 },
  }

  if (!landmarks || landmarks.length < 29) return emptyResult

  const lms = landmarks
  const evals: JointEvaluation[] = []

  // Extract common landmark angles
  const leftElbowAngle = calculateJointAngle(lms[LM.LEFT_SHOULDER], lms[LM.LEFT_ELBOW], lms[LM.LEFT_WRIST])
  const rightElbowAngle = calculateJointAngle(lms[LM.RIGHT_SHOULDER], lms[LM.RIGHT_ELBOW], lms[LM.RIGHT_WRIST])
  const leftShoulderAngle = calculateJointAngle(lms[LM.LEFT_ELBOW], lms[LM.LEFT_SHOULDER], lms[LM.LEFT_HIP])
  const rightShoulderAngle = calculateJointAngle(lms[LM.RIGHT_ELBOW], lms[LM.RIGHT_SHOULDER], lms[LM.RIGHT_HIP])
  const leftHipAngle = calculateJointAngle(lms[LM.LEFT_SHOULDER], lms[LM.LEFT_HIP], lms[LM.LEFT_KNEE])
  const rightHipAngle = calculateJointAngle(lms[LM.RIGHT_SHOULDER], lms[LM.RIGHT_HIP], lms[LM.RIGHT_KNEE])
  const leftKneeAngle = calculateJointAngle(lms[LM.LEFT_HIP], lms[LM.LEFT_KNEE], lms[LM.LEFT_ANKLE])
  const rightKneeAngle = calculateJointAngle(lms[LM.RIGHT_HIP], lms[LM.RIGHT_KNEE], lms[LM.RIGHT_ANKLE])
  const torsoTilt = calculateTorsoTilt(lms[LM.LEFT_SHOULDER], lms[LM.RIGHT_SHOULDER], lms[LM.LEFT_HIP], lms[LM.RIGHT_HIP])

  // Helper to grade an angle
  const evaluateRule = (
    id: string,
    nameEn: string,
    nameMr: string,
    limbKey: string,
    angle: number | null,
    targetMin: number,
    targetMax: number,
    idealAngle: number,
    lowCueEn: string,
    lowCueMr: string,
    highCueEn: string,
    highCueMr: string,
    _weight = 1.0,
  ) => {
    if (angle == null) return
    let dev = 0
    let cueEn = ''
    let cueMr = ''

    if (angle < targetMin) {
      dev = targetMin - angle
      cueEn = lowCueEn
      cueMr = lowCueMr
    } else if (angle > targetMax) {
      dev = angle - targetMax
      cueEn = highCueEn
      cueMr = highCueMr
    }

    const maxDev = 45.0
    const score = Math.max(0, 1.0 - dev / maxDev)
    const status: 'good' | 'warning' | 'fault' = dev <= 6 ? 'good' : dev <= 16 ? 'warning' : 'fault'

    evals.push({
      id,
      nameEn,
      nameMr,
      limbKey,
      currentAngle: Math.round(angle),
      targetMin,
      targetMax,
      idealAngle,
      deviationDeg: Math.round(dev),
      status,
      score,
      cueEn,
      cueMr,
    })
  }

  // ── 1. DOWNWARD DOG (Adho Mukha Svanasana) ──────────────────────────────────
  if (poseId === 'downdog') {
    // Elbows: extended
    evaluateRule(
      'leftElbow', 'Left Arm', 'डावा हात', 'leftElbow', leftElbowAngle,
      155, 180, 175,
      'Straighten left elbow and press through palms', 'डावे कोपर सरळ करा आणि तळवे दाबा',
      'Keep arm steady without hyperextending', 'हात जास्त ताणू नका',
    )
    evaluateRule(
      'rightElbow', 'Right Arm', 'उजवा हात', 'rightElbow', rightElbowAngle,
      155, 180, 175,
      'Straighten right elbow and press through palms', 'उजवे कोपर सरळ करा आणि तळवे दाबा',
      'Keep arm steady without hyperextending', 'हात जास्त ताणू नका',
    )
    // Hips: Acute angle forming apex of inverted V
    evaluateRule(
      'leftHip', 'Hips & Pelvis', 'नितंब व कंबर', 'leftHip', leftHipAngle,
      55, 84, 70,
      'Step back slightly to lengthen spine', 'कणा लांब करण्यासाठी पाय किंचित मागे न्या',
      'Lift hips higher to form an inverted V', 'नितंब छताच्या दिशेने वर उचला आणि उलटा V करा',
      1.5,
    )
    // Knees: Straight legs
    evaluateRule(
      'leftKnee', 'Left Leg', 'डावा पाय', 'leftKnee', leftKneeAngle,
      155, 180, 175,
      'Straighten left knee and press heel down', 'डावा गुडघा सरळ करा आणि टाच जमिनीकडे न्या',
      'Maintain strong straight leg hold', 'पाय सरळ धरा',
      1.2,
    )
    evaluateRule(
      'rightKnee', 'Right Leg', 'उजवा पाय', 'rightKnee', rightKneeAngle,
      155, 180, 175,
      'Straighten right knee and press heel down', 'उजवा गुडघा सरळ करा आणि टाच जमिनीकडे न्या',
      'Maintain strong straight leg hold', 'पाय सरळ धरा',
      1.2,
    )
    // Shoulder extension:
    evaluateRule(
      'leftShoulder', 'Shoulder Angle', 'खांद्याचा विस्तार', 'leftShoulder', leftShoulderAngle,
      140, 180, 165,
      'Open chest toward thighs to extend shoulders', 'खांदे उघडण्यासाठी छाती मांड्यांच्या दिशेने दाबा',
      'Keep arms aligned with spine', 'हात पाठीच्या रेषेत ठेवा',
    )
  }

  // ── 2. GODDESS POSE (Utkata Konasana) ──────────────────────────────────────
  else if (poseId === 'goddess') {
    // Both knees bent deep in wide squat
    evaluateRule(
      'leftKnee', 'Left Knee', 'डावा गुडघा', 'leftKnee', leftKneeAngle,
      80, 115, 95,
      'Lift hips slightly; keep knees around 90°', 'गुडघे नव्वद अंशांच्या आसपास ठेवा',
      'Sink deeper into hips; bend knees toward 90°', 'नितंब आणखी खाली घेऊन गुडघे ९० अंशात वाकवा',
      1.5,
    )
    evaluateRule(
      'rightKnee', 'Right Knee', 'उजवा गुडघा', 'rightKnee', rightKneeAngle,
      80, 115, 95,
      'Lift hips slightly; keep knees around 90°', 'गुडघे नव्वद अंशांच्या आसपास ठेवा',
      'Sink deeper into hips; bend knees toward 90°', 'नितंब आणखी खाली घेऊन गुडघे ९० अंशात वाकवा',
      1.5,
    )
    // Elbows: cactus arms at 90°
    evaluateRule(
      'leftElbow', 'Left Elbow', 'डावे कोपर', 'leftElbow', leftElbowAngle,
      75, 105, 90,
      'Open forearms vertical to the floor', 'हात जमिनीला उभे सरळ ठेवा',
      'Bend elbows to 90° in cactus shape', 'कॅक्टस आकारात कोपरे ९० अंशात वाकवा',
      1.2,
    )
    evaluateRule(
      'rightElbow', 'Right Elbow', 'उजवे कोपर', 'rightElbow', rightElbowAngle,
      75, 105, 90,
      'Open forearms vertical to the floor', 'हात जमिनीला उभे सरळ ठेवा',
      'Bend elbows to 90° in cactus shape', 'कॅक्टस आकारात कोपरे ९० अंशात वाकवा',
      1.2,
    )
    // Shoulders: level upper arms
    evaluateRule(
      'leftShoulder', 'Left Shoulder', 'डावा खांदा', 'leftShoulder', leftShoulderAngle,
      70, 105, 90,
      'Lift elbows level with shoulders', 'कोपरे खांद्याच्या रेषेत वर उचला',
      'Lower shoulders away from ears', 'खांदे सैल ठेवा',
    )
    // Torso: upright vertical
    if (torsoTilt != null) {
      evaluateRule(
        'torsoTilt', 'Spine Alignment', 'कण्याचा तोल', 'leftHip', torsoTilt,
        0, 15, 0,
        '', '',
        'Keep torso tall and upright; avoid leaning forward', 'शरीर पुढे झुकवू नका, पाठीचा कणा सरळ ठेवा',
        1.3,
      )
    }
  }

  // ── 3. PLANK POSE (Phalakasana) ────────────────────────────────────────────
  else if (poseId === 'plank') {
    // Hips: straight line
    const avgHip = (leftHipAngle != null && rightHipAngle != null)
      ? (leftHipAngle + rightHipAngle) / 2
      : (leftHipAngle ?? rightHipAngle)

    evaluateRule(
      'leftHip', 'Core & Spine', 'कंबर व पोट', 'leftHip', avgHip,
      160, 180, 175,
      'Engage core and lift hips to prevent sagging', 'पोट घट्ट करा आणि कंबर वर उचला',
      'Lower hips level with shoulders into a flat plank', 'नितंब खांद्यांच्या रेषेत सपाट आणा',
      1.6,
    )
    // Knees: straight legs
    evaluateRule(
      'leftKnee', 'Left Knee', 'डावा गुडघा', 'leftKnee', leftKneeAngle,
      162, 180, 175,
      'Straighten left leg and engage thigh', 'डावा पाय सरळ करा आणि मांडी घट्ट करा',
      'Keep legs fully extended', 'पाय ताठ ठेवा',
      1.2,
    )
    evaluateRule(
      'rightKnee', 'Right Knee', 'उजवा गुडघा', 'rightKnee', rightKneeAngle,
      162, 180, 175,
      'Straighten right leg and engage thigh', 'उजवा पाय सरळ करा आणि मांडी घट्ट करा',
      'Keep legs fully extended', 'पाय ताठ ठेवा',
      1.2,
    )
    // Elbows: extended arms
    evaluateRule(
      'leftElbow', 'Left Arm', 'डावा हात', 'leftElbow', leftElbowAngle,
      155, 180, 175,
      'Press floor away to fully extend arms', 'जमीन खाली दाबून हात पूर्ण सरळ करा',
      'Do not lock elbows violently', 'हात स्थिर ठेवा',
    )
    evaluateRule(
      'rightElbow', 'Right Arm', 'उजवा हात', 'rightElbow', rightElbowAngle,
      155, 180, 175,
      'Press floor away to fully extend arms', 'जमीन खाली दाबून हात पूर्ण सरळ करा',
      'Do not lock elbows violently', 'हात स्थिर ठेवा',
    )
  }

  // ── 4. TREE POSE (Vrksasana) ───────────────────────────────────────────────
  else if (poseId === 'tree') {
    // Dynamically identify standing leg (straighter knee) vs lifted leg (bent knee)
    const leftIsStanding = (leftKneeAngle ?? 0) >= (rightKneeAngle ?? 0)
    const standingKnee = leftIsStanding ? leftKneeAngle : rightKneeAngle
    const liftedKnee = leftIsStanding ? rightKneeAngle : leftKneeAngle
    const standingKey = leftIsStanding ? 'leftKnee' : 'rightKnee'
    const liftedKey = leftIsStanding ? 'rightKnee' : 'leftKnee'
    const standingName = leftIsStanding ? 'Left (Standing) Leg' : 'Right (Standing) Leg'
    const liftedName = leftIsStanding ? 'Right (Lifted) Leg' : 'Left (Lifted) Leg'

    evaluateRule(
      'standingKnee', standingName, 'उभा पाय', standingKey, standingKnee,
      162, 180, 175,
      'Straighten your standing leg and ground foot firmly', 'उभा पाय सरळ ठेवा आणि जमिनीवर घट्ट रोवा',
      'Hold standing leg tall and stable', 'उभा पाय स्थिर ठेवा',
      1.5,
    )
    evaluateRule(
      'liftedKnee', liftedName, 'वाकलेला पाय', liftedKey, liftedKnee,
      25, 75, 45,
      'Open bent knee wider to the side', 'वाकलेला गुडघा आणखी बाहेर उघडा',
      'Place foot firmly against inner thigh or calf', 'पाय मांडीवर किंवा पोटरीवर व्यवस्थित टेकवा',
      1.3,
    )
    // Torso: upright
    if (torsoTilt != null) {
      evaluateRule(
        'torsoTilt', 'Spine Balance', 'शरीराचा तोल', 'leftHip', torsoTilt,
        0, 14, 0,
        '', '',
        'Center your torso over your standing foot; avoid tilting', 'शरीर एका बाजूला झुकवू नका, मध्यभागी तोल साधा',
        1.4,
      )
    }
  }

  // ── 5. WARRIOR II (Virabhadrasana II) ───────────────────────────────────────
  else if (poseId === 'warrior2') {
    // Dynamically determine front (bent) vs back (straight) leg
    const leftIsFront = (leftKneeAngle ?? 180) < (rightKneeAngle ?? 180)
    const frontKnee = leftIsFront ? leftKneeAngle : rightKneeAngle
    const backKnee = leftIsFront ? rightKneeAngle : leftKneeAngle
    const frontKey = leftIsFront ? 'leftKnee' : 'rightKnee'
    const backKey = leftIsFront ? 'rightKnee' : 'leftKnee'
    const frontName = leftIsFront ? 'Front (Left) Knee' : 'Front (Right) Knee'
    const backName = leftIsFront ? 'Back (Right) Leg' : 'Back (Left) Leg'

    evaluateRule(
      'frontKnee', frontName, 'पुढचा गुडघा', frontKey, frontKnee,
      82, 110, 92,
      'Keep front knee stacked directly over ankle', 'पुढचा गुडघा घोट्यावर सरळ ठेवा',
      'Bend front knee deeper toward 90°', 'पुढचा गुडघा आणखी नव्वद अंशात वाकवा',
      1.5,
    )
    evaluateRule(
      'backKnee', backName, 'मागचा पाय', backKey, backKnee,
      162, 180, 175,
      'Straighten your back leg and press into outer foot', 'मागचा पाय पूर्ण सरळ ताठ ठेवा',
      'Keep back leg grounded and strong', 'मागचा पाय मजबूत ठेवा',
      1.4,
    )
    // Arms horizontal at shoulder height
    evaluateRule(
      'leftShoulder', 'Left Arm Height', 'डावा हात उंची', 'leftShoulder', leftShoulderAngle,
      78, 108, 90,
      'Raise left arm parallel to the floor at shoulder level', 'डावा हात खांद्याच्या रेषेत समांतर उचला',
      'Soften shoulders away from ears', 'खांदे सैल ठेवा',
      1.1,
    )
    evaluateRule(
      'rightShoulder', 'Right Arm Height', 'उजवा हात उंची', 'rightShoulder', rightShoulderAngle,
      78, 108, 90,
      'Raise right arm parallel to the floor at shoulder level', 'उजवा हात खांद्याच्या रेषेत समांतर उचला',
      'Soften shoulders away from ears', 'खांदे सैल ठेवा',
      1.1,
    )
    // Straight elbows
    evaluateRule(
      'leftElbow', 'Left Elbow', 'डावे कोपर', 'leftElbow', leftElbowAngle,
      155, 180, 175,
      'Extend left arm fully through fingertips', 'डावा हात बोटांपर्यंत सरळ ताणा',
      'Keep arm straight and strong', 'हात ताठ ठेवा',
    )
    evaluateRule(
      'rightElbow', 'Right Elbow', 'उजवे कोपर', 'rightElbow', rightElbowAngle,
      155, 180, 175,
      'Extend right arm fully through fingertips', 'उजवा हात बोटांपर्यंत सरळ ताणा',
      'Keep arm straight and strong', 'हात ताठ ठेवा',
    )
    // Torso upright
    if (torsoTilt != null) {
      evaluateRule(
        'torsoTilt', 'Torso Centering', 'धडाचा तोल', 'leftHip', torsoTilt,
        0, 15, 0,
        '', '',
        'Keep torso centered vertically between hips; avoid leaning', 'शरीर पुढे झुकवू नका, दोन्ही पायांच्या मध्यभागी ठेवा',
        1.2,
      )
    }
  }

// ── 6. ARDHA MATSYENDRASANA (Half Spinal Twist) ────────────────────────────
  else if (poseId === 'ardhamatsyendrasana') {
    // Upright spine in spinal rotation
    if (torsoTilt != null) {
      evaluateRule(
        'torsoTilt', 'Spine Alignment', 'कण्याचा तोल', 'leftHip', torsoTilt,
        0, 15, 0,
        '', '',
        'Keep spine upright and tall; avoid leaning back', 'पाठीचा कणा सरळ ताठ ठेवा, मागे झुकू नका',
        1.5,
      )
    }
    // Bent crossed knee (acute angle)
    const minKnee = Math.min(leftKneeAngle ?? 180, rightKneeAngle ?? 180)
    const crossedKey = (leftKneeAngle ?? 180) < (rightKneeAngle ?? 180) ? 'leftKnee' : 'rightKnee'
    evaluateRule(
      'crossedKnee', 'Crossed Knee', 'वाकलेला गुडघा', crossedKey, minKnee,
      30, 85, 55,
      'Draw crossed knee closer to your chest', 'वाकलेला गुडघा छातीच्या आणखी जवळ आणा',
      'Keep crossed knee bent and hugged comfortably', 'गुडघा योग्य अंतरावर वाकवून ठेवा',
      1.4,
    )
    // Twisting arm leverage
    const activeElbow = (leftElbowAngle != null && rightElbowAngle != null)
      ? Math.min(leftElbowAngle, rightElbowAngle)
      : (leftElbowAngle ?? rightElbowAngle)
    evaluateRule(
      'twistArm', 'Twisting Arm', 'वळलेला हात', 'leftElbow', activeElbow,
      65, 140, 95,
      'Open arm to support the twist smoothly', 'वळण्यासाठी हाताचा व्यवस्थित आधार घ्या',
      'Maintain gentle leverage without forcing the twist', 'पाठीवर जास्त जोर न देता हात स्थिर ठेवा',
      1.2,
    )
    // Grounded shoulders
    evaluateRule(
      'leftShoulder', 'Shoulder Posture', 'खांद्याची स्थिती', 'leftShoulder', leftShoulderAngle,
      20, 75, 45,
      'Broaden chest and rotate shoulders evenly', 'छाती रुंद करून खांदे समपातळीत फिरवा',
      'Lower shoulders away from ears', 'खांदे सैल ठेवा',
      1.1,
    )
  }

  // ── 7. BADDHA KONASANA (Bound Angle / Butterfly) ───────────────────────────
  else if (poseId === 'baddhakonasana') {
    // Both knees bent outward with feet together
    evaluateRule(
      'leftKnee', 'Left Knee', 'डावा गुडघा', 'leftKnee', leftKneeAngle,
      15, 75, 40,
      'Relax hips and let left knee drop outward', 'नितंब सैल करून डावा गुडघा जमिनीकडे सोडा',
      'Bring feet closer to pelvis to fold knees deeper', 'पावले आणखी जवळ घेऊन गुडघे वाकवा',
      1.5,
    )
    evaluateRule(
      'rightKnee', 'Right Knee', 'उजवा गुडघा', 'rightKnee', rightKneeAngle,
      15, 75, 40,
      'Relax hips and let right knee drop outward', 'नितंब सैल करून उजवा गुडघा जमिनीकडे सोडा',
      'Bring feet closer to pelvis to fold knees deeper', 'पावले आणखी जवळ घेऊन गुडघे वाकवा',
      1.5,
    )
    // Upright spine
    if (torsoTilt != null) {
      evaluateRule(
        'torsoTilt', 'Spine Alignment', 'कण्याचा तोल', 'leftHip', torsoTilt,
        0, 16, 0,
        '', '',
        'Sit tall through the crown of your head; avoid rounding back', 'कणा ताठ ठेवा, पाठ वाकवू नका',
        1.4,
      )
    }
    // Arms holding feet
    evaluateRule(
      'leftElbow', 'Left Arm', 'डावा हात', 'leftElbow', leftElbowAngle,
      100, 175, 145,
      'Hold feet with relaxed elbows', 'हात सैल ठेवून पावले धरा',
      'Keep arm relaxed while holding feet', 'हात सैल ठेवा',
    )
    evaluateRule(
      'rightElbow', 'Right Arm', 'उजवा हात', 'rightElbow', rightElbowAngle,
      100, 175, 145,
      'Hold feet with relaxed elbows', 'हात सैल ठेवून पावले धरा',
      'Keep arm relaxed while holding feet', 'हात सैल ठेवा',
    )
  }

  // ── 8. DANDASANA (Staff Pose) ──────────────────────────────────────────────
  else if (poseId === 'dandasana') {
    // Straight legs flat on floor
    evaluateRule(
      'leftKnee', 'Left Leg', 'डावा पाय', 'leftKnee', leftKneeAngle,
      158, 180, 175,
      'Straighten left knee and press thigh into the mat', 'डावा गुडघा सरळ करा आणि मांडी चटईवर दाबा',
      'Keep left leg grounded and straight', 'पाय सरळ ठेवा',
      1.5,
    )
    evaluateRule(
      'rightKnee', 'Right Leg', 'उजवा पाय', 'rightKnee', rightKneeAngle,
      158, 180, 175,
      'Straighten right knee and press thigh into the mat', 'उजवा गुडघा सरळ करा आणि मांडी चटईवर दाबा',
      'Keep right leg grounded and straight', 'पाय सरळ ठेवा',
      1.5,
    )
    // 90° seated angle between torso and legs
    const avgHip = (leftHipAngle != null && rightHipAngle != null)
      ? (leftHipAngle + rightHipAngle) / 2
      : (leftHipAngle ?? rightHipAngle)
    evaluateRule(
      'leftHip', 'Hip Angle (90°)', 'कंबरेचा ९०° कोन', 'leftHip', avgHip,
      75, 105, 90,
      'Sit tall without leaning forward past ninety degrees', 'पुढे न झुकता नव्वद अंशात बसा',
      'Engage core to bring torso upright to ninety degrees', 'पोट घट्ट करून शरीर ९० अंशात सरळ आणा',
      1.6,
    )
    // Spine perfectly vertical
    if (torsoTilt != null) {
      evaluateRule(
        'torsoTilt', 'Spine Alignment', 'कण्याचा तोल', 'leftHip', torsoTilt,
        0, 12, 0,
        '', '',
        'Lengthen spine like a straight staff; avoid slouching', 'काठीसारखा कणा वर ताठ ठेवा, वाकू नका',
        1.5,
      )
    }
    // Arms grounded beside hips
    evaluateRule(
      'leftElbow', 'Left Arm', 'डावा हात', 'leftElbow', leftElbowAngle,
      150, 180, 175,
      'Press left palm flat into mat beside hip', 'डावा हात नितंबाजवळ चटईवर सरळ ठेवा',
      'Keep left arm straight and stable', 'हात सरळ ठेवा',
    )
    evaluateRule(
      'rightElbow', 'Right Arm', 'उजवा हात', 'rightElbow', rightElbowAngle,
      150, 180, 175,
      'Press right palm flat into mat beside hip', 'उजवा हात नितंबाजवळ चटईवर सरळ ठेवा',
      'Keep right arm straight and stable', 'हात सरळ ठेवा',
    )
  }

  // ── 9. PADMASANA (Lotus Pose) ──────────────────────────────────────────────
  else if (poseId === 'padmasana') {
    // Both knees deeply flexed in lotus cross
    evaluateRule(
      'leftKnee', 'Left Knee', 'डावा गुडघा', 'leftKnee', leftKneeAngle,
      15, 65, 35,
      'Fold left knee snugly over opposite thigh', 'डावा गुडघा वाकवून पाऊल मांडीवर ठेवा',
      'Bring foot securely onto upper thigh', 'पाऊल मांडीच्या वर व्यवस्थित ठेवा',
      1.5,
    )
    evaluateRule(
      'rightKnee', 'Right Knee', 'उजवा गुडघा', 'rightKnee', rightKneeAngle,
      15, 65, 35,
      'Fold right knee snugly over opposite thigh', 'उजवा गुडघा वाकवून पाऊल मांडीवर ठेवा',
      'Bring foot securely onto upper thigh', 'पाऊल मांडीच्या वर व्यवस्थित ठेवा',
      1.5,
    )
    // Vertical spine
    if (torsoTilt != null) {
      evaluateRule(
        'torsoTilt', 'Spine Alignment', 'कण्याचा तोल', 'leftHip', torsoTilt,
        0, 12, 0,
        '', '',
        'Sit tall with erect spine and open chest', 'कणा ताठ ठेवा आणि छाती मोकळी ठेवा',
        1.5,
      )
    }
    // Arms resting on knees in mudra
    evaluateRule(
      'leftElbow', 'Left Arm', 'डावा हात', 'leftElbow', leftElbowAngle,
      130, 180, 165,
      'Rest left wrist comfortably on left knee', 'डावा हात मुद्रेत डाव्या गुडघ्यावर ठेवा',
      'Keep left arm relaxed without locking', 'डावा हात सैल ठेवा',
    )
    evaluateRule(
      'rightElbow', 'Right Arm', 'उजवा हात', 'rightElbow', rightElbowAngle,
      130, 180, 165,
      'Rest right wrist comfortably on right knee', 'उजवा हात मुद्रेत उजव्या गुडघ्यावर ठेवा',
      'Keep right arm relaxed without locking', 'उजवा हात सैल ठेवा',
    )
  }

    // ── Compute Composite Scores ───────────────────────────────────────────────
  if (evals.length === 0) return emptyResult

  const totalScoreSum = evals.reduce((sum, e) => sum + e.score, 0)
  const geomAccuracy = Math.round((totalScoreSum / evals.length) * 100)

  // Sub-scores
  const armEvals = evals.filter((e) => e.id.toLowerCase().includes('elbow') || e.id.toLowerCase().includes('shoulder'))
  const coreEvals = evals.filter((e) => e.id.toLowerCase().includes('hip') || e.id.toLowerCase().includes('tilt'))
  const legEvals = evals.filter((e) => e.id.toLowerCase().includes('knee'))

  const avgSub = (list: JointEvaluation[]) =>
    list.length > 0 ? Math.round((list.reduce((s, e) => s + e.score, 0) / list.length) * 100) : geomAccuracy

  const armsScore = avgSub(armEvals)
  const coreScore = avgSub(coreEvals)
  const legsScore = avgSub(legEvals)

  // Blend with holistic ML classification probability (75% geometric angles + 25% ML model)
  const mlScore = Math.round(Math.max(0, Math.min(100, mlConfidence * 100)))
  const finalAccuracy = Math.round(geomAccuracy * 0.75 + mlScore * 0.25)

  // Collect faults (deviations > 15°)
  const faultEvals = evals.filter((e) => e.status === 'fault').sort((a, b) => b.deviationDeg - a.deviationDeg)

  const detailedFaults: DetailedCue[] = faultEvals.map((e) => ({
    id: e.id,
    jointNameEn: e.nameEn,
    jointNameMr: e.nameMr,
    en: e.cueEn,
    mr: e.cueMr,
  }))

  const isMatched = finalAccuracy >= 74 && faultEvals.length === 0
  const status: 'good' | 'okay' | 'off' = isMatched ? 'good' : finalAccuracy >= 52 ? 'okay' : 'off'

  // Primary directional cue
  let primaryCueEn = 'Form matches target posture — hold steady with calm breath!'
  let primaryCueMr = 'मुद्रा योग्य जुळली आहे — शांत श्वासासह स्थिर रहा!'

  if (faultEvals.length > 0) {
    const top = faultEvals[0]
    primaryCueEn = `${top.nameEn}: ${top.cueEn} (±${top.deviationDeg}°)`
    primaryCueMr = `${top.nameMr}: ${top.cueMr} (±${top.deviationDeg}°)`
  } else if (!isMatched) {
    primaryCueEn = 'Align body closer to target posture to lock form'
    primaryCueMr = 'आसन निश्चित करण्यासाठी मुद्रा अधिक अचूक करा'
  }

  return {
    poseId,
    accuracy: finalAccuracy,
    isMatched,
    status,
    faults: detailedFaults,
    jointEvaluations: evals,
    primaryCueEn,
    primaryCueMr,
    alignmentDetails: {
      armsScore,
      coreScore,
      legsScore,
    },
  }
}

// ── Mistakes & Corrections Tracker ───────────────────────────────────────────

export interface LivePostureProgress {
  accuracy: number
  recentAccuracy: number
  initialAccuracy: number
  improvementPct: number
  activeMistakes: ActiveMistake[]
  correctionsCount: number
  correctionsHistory: {
    jointNameEn: string
    jointNameMr: string
    resolvedAt: number
    cueEn: string
  }[]
  accuracyHistory: number[]
  topFaultsSummary: JointFaultSummary[]
}

export class PostureCorrectionTracker {
  private activeMistakesMap = new Map<string, ActiveMistake>()
  private faultStatsMap = new Map<
    string,
    {
      id: string
      jointNameEn: string
      jointNameMr: string
      count: number
      totalDev: number
      sampleCueEn: string
      sampleCueMr: string
    }
  >()
  private correctionsHistory: {
    jointNameEn: string
    jointNameMr: string
    resolvedAt: number
    cueEn: string
  }[] = []
  private correctionsCount = 0
  private accuracyHistory: number[] = []
  private lastSampleTime = 0
  private initialSamples: number[] = []
  private latestSamples: number[] = []

  public reset() {
    this.activeMistakesMap.clear()
    this.faultStatsMap.clear()
    this.correctionsHistory = []
    this.correctionsCount = 0
    this.accuracyHistory = []
    this.lastSampleTime = 0
    this.initialSamples = []
    this.latestSamples = []
  }

  public update(evaluation: PostureEvaluationResult, nowMs: number) {
    // 1. Record accuracy sample once every ~800ms
    if (nowMs - this.lastSampleTime >= 800) {
      this.lastSampleTime = nowMs
      this.accuracyHistory.push(evaluation.accuracy)
      if (this.initialSamples.length < 5) {
        this.initialSamples.push(evaluation.accuracy)
      }
      this.latestSamples.push(evaluation.accuracy)
      if (this.latestSamples.length > 5) this.latestSamples.shift()
    }

    const currentFaultIds = new Set<string>()

    // 2. Process current faults from evaluation
    for (const joint of evaluation.jointEvaluations) {
      if (joint.status === 'fault') {
        currentFaultIds.add(joint.id)
        const existing = this.activeMistakesMap.get(joint.id)

        if (existing) {
          existing.lastUpdated = nowMs
          existing.durationMs = nowMs - existing.firstDetectedAt
          existing.deviationDeg = joint.deviationDeg
          existing.cueEn = joint.cueEn
          existing.cueMr = joint.cueMr
        } else {
          this.activeMistakesMap.set(joint.id, {
            id: joint.id,
            jointNameEn: joint.nameEn,
            jointNameMr: joint.nameMr,
            limbKey: joint.limbKey,
            deviationDeg: joint.deviationDeg,
            cueEn: joint.cueEn,
            cueMr: joint.cueMr,
            firstDetectedAt: nowMs,
            lastUpdated: nowMs,
            durationMs: 0,
          })

          // Track cumulative occurrences
          const stat = this.faultStatsMap.get(joint.id) ?? {
            id: joint.id,
            jointNameEn: joint.nameEn,
            jointNameMr: joint.nameMr,
            count: 0,
            totalDev: 0,
            sampleCueEn: joint.cueEn,
            sampleCueMr: joint.cueMr,
          }
          stat.count += 1
          stat.totalDev += joint.deviationDeg
          this.faultStatsMap.set(joint.id, stat)
        }
      }
    }

    // 3. Check for resolved mistakes (Corrections Performed)
    for (const [id, mistake] of Array.from(this.activeMistakesMap.entries())) {
      if (!currentFaultIds.has(id)) {
        // Mistake was resolved! If it lasted for at least 800ms, credit a correction!
        if (mistake.durationMs >= 800) {
          this.correctionsCount += 1
          this.correctionsHistory.push({
            jointNameEn: mistake.jointNameEn,
            jointNameMr: mistake.jointNameMr,
            resolvedAt: nowMs,
            cueEn: mistake.cueEn,
          })
        }
        this.activeMistakesMap.delete(id)
      }
    }
  }

  public getLiveReport(currentAccuracy: number): LivePostureProgress {
    const initAvg =
      this.initialSamples.length > 0
        ? Math.round(this.initialSamples.reduce((a, b) => a + b, 0) / this.initialSamples.length)
        : currentAccuracy
    const recentAvg =
      this.latestSamples.length > 0
        ? Math.round(this.latestSamples.reduce((a, b) => a + b, 0) / this.latestSamples.length)
        : currentAccuracy
    const improvementPct = recentAvg - initAvg

    const topFaultsSummary: JointFaultSummary[] = Array.from(this.faultStatsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((s) => ({
        id: s.id,
        jointNameEn: s.jointNameEn,
        jointNameMr: s.jointNameMr,
        count: s.count,
        avgDeviationDeg: Math.round(s.totalDev / (s.count || 1)),
        sampleCueEn: s.sampleCueEn,
        sampleCueMr: s.sampleCueMr,
      }))

    return {
      accuracy: currentAccuracy,
      recentAccuracy: recentAvg,
      initialAccuracy: initAvg,
      improvementPct,
      activeMistakes: Array.from(this.activeMistakesMap.values()),
      correctionsCount: this.correctionsCount,
      correctionsHistory: [...this.correctionsHistory],
      accuracyHistory: [...this.accuracyHistory],
      topFaultsSummary,
    }
  }
}

