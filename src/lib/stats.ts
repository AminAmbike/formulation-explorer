/**
 * Small statistics helpers. Every function tolerates missing values (null)
 * and returns null instead of NaN when the answer is undefined.
 */

type MaybeNumber = number | null

/** A correlation needs at least this many complete pairs to mean anything. */
export const MIN_POINTS_FOR_CORRELATION = 3

/** Keeps only the positions where both series have a value. */
export function completePairs(xs: MaybeNumber[], ys: MaybeNumber[]): [number[], number[]] {
  const keptX: number[] = []
  const keptY: number[] = []
  const length = Math.min(xs.length, ys.length)
  for (let i = 0; i < length; i++) {
    const x = xs[i]
    const y = ys[i]
    if (x !== null && y !== null) {
      keptX.push(x)
      keptY.push(y)
    }
  }
  return [keptX, keptY]
}

export function mean(values: MaybeNumber[]): number | null {
  let sum = 0
  let count = 0
  for (const value of values) {
    if (value === null) continue
    sum += value
    count++
  }
  return count === 0 ? null : sum / count
}

/** Sample standard deviation, or null with fewer than two values. */
export function standardDeviation(values: MaybeNumber[]): number | null {
  const present = values.filter((value): value is number => value !== null)
  const average = mean(present)
  if (average === null || present.length < 2) return null
  const sumOfSquares = present.reduce((sum, value) => sum + (value - average) ** 2, 0)
  return Math.sqrt(sumOfSquares / (present.length - 1))
}

/**
 * Counts how many values fall into each of `binCount` equal-width bins
 * across [min, max]. The top edge belongs to the last bin.
 */
export function histogram(
  values: MaybeNumber[],
  [min, max]: [number, number],
  binCount: number,
): number[] {
  const counts = new Array<number>(binCount).fill(0)
  const width = (max - min) / binCount
  for (const value of values) {
    if (value === null || value < min || value > max) continue
    const index = width > 0 ? Math.min(binCount - 1, Math.floor((value - min) / width)) : 0
    counts[index]++
  }
  return counts
}

function isConstant(values: number[]): boolean {
  return values.every((value) => value === values[0])
}

/** Sum of products of deviations from the mean: the shared core of r and the fit line. */
function deviations(xs: number[], ys: number[]) {
  const meanX = mean(xs) ?? 0
  const meanY = mean(ys) ?? 0
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  return { meanX, meanY, sxx, syy, sxy }
}

/**
 * Pearson correlation coefficient, from -1 to 1.
 * Returns null with fewer than three complete pairs or when either series is constant.
 */
export function pearson(xs: MaybeNumber[], ys: MaybeNumber[]): number | null {
  const [x, y] = completePairs(xs, ys)
  if (x.length < MIN_POINTS_FOR_CORRELATION) return null
  // Checked explicitly: floating-point error can leave a constant series with a tiny non-zero variance.
  if (isConstant(x) || isConstant(y)) return null
  const { sxx, syy, sxy } = deviations(x, y)
  const r = sxy / Math.sqrt(sxx * syy)
  return Math.max(-1, Math.min(1, r))
}

export interface LinearFit {
  slope: number
  intercept: number
}

/** Least-squares line y = slope * x + intercept, or null when x does not vary. */
export function linearFit(xs: MaybeNumber[], ys: MaybeNumber[]): LinearFit | null {
  const [x, y] = completePairs(xs, ys)
  if (x.length < 2 || isConstant(x)) return null
  const { meanX, meanY, sxx, sxy } = deviations(x, y)
  const slope = sxy / sxx
  return { slope, intercept: meanY - slope * meanX }
}
