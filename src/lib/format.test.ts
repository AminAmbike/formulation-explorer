import { describe, expect, it } from 'vitest'
import type { Variable } from '@/data'
import { formatCorrelation, formatDate, formatValue } from './format'

const variable = (decimals: number): Variable => ({
  key: 'x',
  kind: 'output',
  family: 'Measurement',
  extent: [0, 1],
  decimals,
})

describe('formatValue', () => {
  it('uses the precision the variable was recorded with', () => {
    expect(formatValue(2554.4, variable(1))).toBe('2,554.4')
    expect(formatValue(62, variable(1))).toBe('62.0')
    expect(formatValue(3.22, variable(2))).toBe('3.22')
    expect(formatValue(375, variable(0))).toBe('375')
  })

  it('shows a dash for missing values', () => {
    expect(formatValue(null, variable(1))).toBe('–')
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
