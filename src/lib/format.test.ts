import { describe, expect, it } from 'vitest'
import type { Variable } from '@/data'
import { formatCorrelation, formatDate, formatValue } from './format'

const variable = (extent: [number, number]): Variable => ({
  key: 'x',
  kind: 'output',
  family: 'Measurement',
  extent,
})

describe('formatValue', () => {
  it('picks decimals from the scale of the variable', () => {
    expect(formatValue(2554.4, variable([2160, 3561]))).toBe('2,554')
    expect(formatValue(61.94, variable([42, 71]))).toBe('61.9')
    expect(formatValue(3.256, variable([2.8, 4]))).toBe('3.26')
  })

  it('shows a dash for missing values', () => {
    expect(formatValue(null, variable([0, 1]))).toBe('–')
  })
})

describe('formatCorrelation', () => {
  it('always shows the sign', () => {
    expect(formatCorrelation(0.884)).toBe('+0.88')
    expect(formatCorrelation(-0.82)).toBe('−0.82')
  })

  it('does not show a sign on a value that rounds to zero', () => {
    expect(formatCorrelation(-0.001)).toBe('0.00')
  })

  it('shows a dash when undefined', () => {
    expect(formatCorrelation(null)).toBe('–')
  })
})

describe('formatDate', () => {
  it('formats an ISO date without shifting the day across time zones', () => {
    expect(formatDate('2017-01-04')).toBe('Jan 4')
  })

  it('shows a dash for a missing or invalid date', () => {
    expect(formatDate(null)).toBe('–')
    expect(formatDate('not-a-date')).toBe('–')
  })
})
