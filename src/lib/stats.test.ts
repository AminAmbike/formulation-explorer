import { describe, expect, it } from 'vitest'
import { completePairs, linearFit, mean, pearson, ranks, spearman } from './stats'

describe('completePairs', () => {
  it('drops positions where either value is missing', () => {
    expect(completePairs([1, null, 3, 4], [10, 20, null, 40])).toEqual([
      [1, 4],
      [10, 40],
    ])
  })
})

describe('mean', () => {
  it('ignores missing values', () => {
    expect(mean([1, null, 3])).toBe(2)
  })

  it('is null when there are no values', () => {
    expect(mean([])).toBeNull()
    expect(mean([null])).toBeNull()
  })
})

describe('pearson', () => {
  it('is 1 for a perfect increasing line and -1 for a decreasing one', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1)
  })

  it('matches a hand-computed value', () => {
    // Deviations: sxy = 8, sxx = 10, syy = 10, so r = 8 / 10.
    expect(pearson([1, 2, 3, 4, 5], [2, 1, 4, 3, 5])).toBeCloseTo(0.8)
  })

  it('is null with fewer than three complete pairs', () => {
    expect(pearson([1, 2], [1, 2])).toBeNull()
    expect(pearson([1, 2, null], [1, 2, 3])).toBeNull()
  })

  it('is null when either series is constant', () => {
    expect(pearson([5, 5, 5], [1, 2, 3])).toBeNull()
    // 0.1 three times has a non-zero floating-point variance; it must still count as constant.
    expect(pearson([1, 2, 3], [0.1, 0.1, 0.1])).toBeNull()
  })
})

describe('ranks', () => {
  it('gives tied values the average of their ranks', () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4])
  })

  it('keeps the original order of the input', () => {
    expect(ranks([30, 10, 20])).toEqual([3, 1, 2])
  })
})

describe('spearman', () => {
  it('is 1 for any increasing relationship, even a curved one', () => {
    expect(spearman([1, 2, 3, 4], [1, 4, 9, 16])).toBeCloseTo(1)
  })

  it('is less affected by one extreme point than pearson', () => {
    const xs = [1, 2, 3, 4, 100]
    const ys = [2, 1, 4, 3, 5]
    expect(spearman(xs, ys)).toBeCloseTo(0.8)
    expect(pearson(xs, ys)).not.toBeCloseTo(0.8)
  })
})

describe('linearFit', () => {
  it('recovers the slope and intercept of an exact line', () => {
    const fit = linearFit([0, 1, 2], [1, 3, 5])
    expect(fit?.slope).toBeCloseTo(2)
    expect(fit?.intercept).toBeCloseTo(1)
  })

  it('is null when x does not vary', () => {
    expect(linearFit([2, 2, 2], [1, 2, 3])).toBeNull()
  })
})
