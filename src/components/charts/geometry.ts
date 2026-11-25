/** Pixel-space helpers shared by the charts' pointer interactions. */

export interface Point {
  x: number
  y: number
}

/** A rectangle with x0 <= x1 and y0 <= y1. */
export interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function rectFromCorners(a: Point, b: Point): Rect {
  return {
    x0: Math.min(a.x, b.x),
    y0: Math.min(a.y, b.y),
    x1: Math.max(a.x, b.x),
    y1: Math.max(a.y, b.y),
  }
}

/**
 * The point closest to the target, or null if none is within maxDistance.
 * Lets the pointer be "near" a small dot instead of exactly on it.
 */
export function nearestPoint<T extends Point>(
  points: T[],
  target: Point,
  maxDistance: number,
): T | null {
  let nearest: T | null = null
  let nearestDistance = maxDistance
  for (const point of points) {
    const distance = Math.hypot(point.x - target.x, point.y - target.y)
    if (distance <= nearestDistance) {
      nearest = point
      nearestDistance = distance
    }
  }
  return nearest
}

export function pointsInRect<T extends Point>(points: T[], rect: Rect): T[] {
  return points.filter(
    (point) =>
      point.x >= rect.x0 && point.x <= rect.x1 && point.y >= rect.y0 && point.y <= rect.y1,
  )
}
