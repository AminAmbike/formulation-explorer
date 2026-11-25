import { describe, expect, it } from 'vitest'
import { nearestPoint, pointsInRect, rectFromCorners } from './geometry'

const points = [
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 10, y: 0 },
  { id: 'c', x: 10, y: 10 },
]

describe('rectFromCorners', () => {
  it('normalises a drag in any direction', () => {
    expect(rectFromCorners({ x: 10, y: 2 }, { x: 4, y: 8 })).toEqual({ x0: 4, y0: 2, x1: 10, y1: 8 })
  })
})

describe('nearestPoint', () => {
  it('finds the closest point within range', () => {
    expect(nearestPoint(points, { x: 8, y: 1 }, 5)?.id).toBe('b')
  })

  it('returns null when nothing is close enough', () => {
    expect(nearestPoint(points, { x: 50, y: 50 }, 5)).toBeNull()
    expect(nearestPoint([], { x: 0, y: 0 }, 5)).toBeNull()
  })
})

describe('pointsInRect', () => {
  it('includes points on the edge', () => {
    const inside = pointsInRect(points, { x0: 5, y0: 0, x1: 10, y1: 10 })
    expect(inside.map((p) => p.id)).toEqual(['b', 'c'])
  })
})
