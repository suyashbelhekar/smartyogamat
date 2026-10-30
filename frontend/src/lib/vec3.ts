/** Vector helpers matching the Android ML Kit demo Utils (including argument order). */

export type Vec3 = { x: number; y: number; z: number }

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z)
}

/** Java `subtract(b, a)` returns `a - b`. */
export function subtract(b: Vec3, a: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z)
}

export function multiply(a: Vec3, multiple: number | Vec3): Vec3 {
  if (typeof multiple === 'number') {
    return vec3(a.x * multiple, a.y * multiple, a.z * multiple)
  }
  return vec3(a.x * multiple.x, a.y * multiple.y, a.z * multiple.z)
}

export function average(a: Vec3, b: Vec3): Vec3 {
  return vec3((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5)
}

export function l2Norm2D(point: Vec3): number {
  return Math.hypot(point.x, point.y)
}

export function maxAbs(point: Vec3): number {
  return Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z))
}

export function sumAbs(point: Vec3): number {
  return Math.abs(point.x) + Math.abs(point.y) + Math.abs(point.z)
}

export function subtractAll(p: Vec3, points: Vec3[]): Vec3[] {
  return points.map((item) => subtract(p, item))
}

export function multiplyAll(points: Vec3[], multiple: number | Vec3): Vec3[] {
  return points.map((item) => multiply(item, multiple))
}
