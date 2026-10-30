/** MediaPipe pose landmark indices (33-point model). */

export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

export const NUM_LANDMARKS = 33

export type PoseGroup = 'standing' | 'sitting' | 'floor'

/**
 * The 9 classes the trained ML model knows.
 * Order here is ALPHABETICAL by dataset class name — matches weights.json & pose_classes.json:
 * ['ardhamatsyendrasana', 'baddhakonasana', 'dandasana', 'downdog', 'goddess', 'padmasana', 'plank', 'tree', 'warrior2']
 */
export type PoseClassId =
  | 'ardhamatsyendrasana'
  | 'baddhakonasana'
  | 'dandasana'
  | 'downdog'
  | 'goddess'
  | 'padmasana'
  | 'plank'
  | 'tree'
  | 'warrior2'

export type PoseMeta = {
  name: string
  sanskrit: string
  /** Class name as used in weights.json classes array — used for model lookup */
  modelClass: string
  group: PoseGroup
  icon: string
}

// ── 9 dataset poses ───────────────────────────────────────────────────────────

export const STANDING_POSES: PoseClassId[] = [
  'goddess',
  'tree',
  'warrior2',
]

export const SITTING_POSES: PoseClassId[] = [
  'ardhamatsyendrasana',
  'baddhakonasana',
  'dandasana',
  'padmasana',
]

export const FLOOR_POSES: PoseClassId[] = [
  'downdog',
  'plank',
]

export const POSE_CLASSES: PoseClassId[] = [
  ...STANDING_POSES,
  ...SITTING_POSES,
  ...FLOOR_POSES,
]

export const POSE_META: Record<PoseClassId, PoseMeta> = {
  ardhamatsyendrasana: {
    name: 'Half Spinal Twist',
    sanskrit: 'Ardha Matsyendrasana',
    modelClass: 'ardhamatsyendrasana',
    group: 'sitting',
    icon: '🧘‍♂️',
  },
  baddhakonasana: {
    name: 'Bound Angle (Butterfly)',
    sanskrit: 'Baddha Konasana',
    modelClass: 'baddhakonasana',
    group: 'sitting',
    icon: '🦋',
  },
  dandasana: {
    name: 'Staff Pose',
    sanskrit: 'Dandasana',
    modelClass: 'dandasana',
    group: 'sitting',
    icon: '🪵',
  },
  downdog: {
    name: 'Downward-Facing Dog',
    sanskrit: 'Adho Mukha Svanasana',
    modelClass: 'downdog',
    group: 'floor',
    icon: '🐕',
  },
  goddess: {
    name: 'Goddess',
    sanskrit: 'Utkata Konasana',
    modelClass: 'goddess',
    group: 'standing',
    icon: '✨',
  },
  padmasana: {
    name: 'Lotus Pose',
    sanskrit: 'Padmasana',
    modelClass: 'padmasana',
    group: 'sitting',
    icon: '🪷',
  },
  plank: {
    name: 'Plank',
    sanskrit: 'Phalakasana',
    modelClass: 'plank',
    group: 'floor',
    icon: '📏',
  },
  tree: {
    name: 'Tree',
    sanskrit: 'Vrksasana',
    modelClass: 'tree',
    group: 'standing',
    icon: '🌳',
  },
  warrior2: {
    name: 'Warrior II',
    sanskrit: 'Virabhadrasana II',
    modelClass: 'warrior2',
    group: 'standing',
    icon: '⚔️',
  },
}

export const POSE_IMAGES: Record<PoseClassId, string> = {
  ardhamatsyendrasana: '/images/yoga/ardhamatsyendrasana.jpg',
  baddhakonasana:      '/images/yoga/baddhakonasana.jpg',
  dandasana:           '/images/yoga/dandasana.jpg',
  downdog:             '/images/yoga/downdog.jpg',
  goddess:             '/images/yoga/goddess.jpg',
  padmasana:           '/images/yoga/padmasana.jpg',
  plank:               '/images/yoga/plank.jpg',
  tree:                '/images/yoga/tree.jpg',
  warrior2:            '/images/yoga/warrior2.jpg',
}

export function emptyScores(): Record<PoseClassId, number> {
  return Object.fromEntries(POSE_CLASSES.map((id) => [id, 0])) as Record<PoseClassId, number>
}
