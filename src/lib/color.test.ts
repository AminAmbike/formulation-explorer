import { describe, expect, it } from 'vitest'
import { contrast, luminance, parseColor, readableInk } from './color'
import { palette } from './palette'

describe('parseColor', () => {
  it('reads hex and rgb() strings', () => {
    expect(parseColor('#256abf')).toEqual([37, 106, 191])
    expect(parseColor('rgb(37, 106, 191)')).toEqual([37, 106, 191])
  })

  it('rejects formats it does not understand', () => {
    expect(() => parseColor('blue')).toThrow()
  })
})

describe('luminance and contrast', () => {
  it('spans black to white', () => {
    expect(luminance('#000000')).toBe(0)
    expect(luminance('#ffffff')).toBeCloseTo(1)
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21)
  })
})

describe('readableInk', () => {
  it('uses dark text on light fills and white text on dark fills', () => {
    expect(readableInk(palette.neutral)).toBe(palette.ink)
    expect(readableInk(palette.sequentialHigh)).toBe('#ffffff')
  })
})
