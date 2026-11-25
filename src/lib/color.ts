import { palette } from './palette'

/** Reads "#rrggbb" or "rgb(r, g, b)" (what d3 scales return) into 0–255 channels. */
export function parseColor(color: string): [r: number, g: number, b: number] {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)]
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(color)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  throw new Error(`Unsupported colour format: ${color}`)
}

/** WCAG relative luminance: 0 is black, 1 is white. */
export function luminance(color: string): number {
  const [r, g, b] = parseColor(color).map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two colours, from 1 (identical) to 21. */
export function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Dark or white text, whichever is easier to read on the given fill. */
export function readableInk(fill: string): string {
  return contrast(fill, palette.ink) >= contrast(fill, '#ffffff') ? palette.ink : '#ffffff'
}
