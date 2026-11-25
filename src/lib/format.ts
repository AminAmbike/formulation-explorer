import type { Variable } from '@/data'

/** Shown wherever a value is missing or undefined. */
export const MISSING = '–'

/** Formats a value with as many decimals as the variable was recorded with. */
export function formatValue(value: number | null | undefined, variable: Variable): string {
  if (value === null || value === undefined) return MISSING
  return value.toLocaleString('en-US', {
    minimumFractionDigits: variable.decimals,
    maximumFractionDigits: variable.decimals,
  })
}

/** A value with its unit: "38.9%", "425 °F", "2,554.4 cP". */
export function formatWithUnit(value: number | null | undefined, variable: Variable): string {
  const text = formatValue(value, variable)
  if (text === MISSING || variable.unit === '') return text
  // A percent sign sits against the number; other units are separated by a non-breaking space.
  return variable.unit === '%' ? `${text}%` : `${text}\u00a0${variable.unit}`
}

/** A variable's name with its unit, for axis titles and headings: "Viscosity (cP)". */
export function labelWithUnit(variable: Variable): string {
  return variable.unit === '' ? variable.key : `${variable.key} (${variable.unit})`
}

/** "+0.88" / "−0.82", using a true minus sign so the columns align. */
export function formatCorrelation(r: number | null): string {
  if (r === null) return MISSING
  const rounded = Math.abs(r).toFixed(2)
  if (Number(rounded) === 0) return '0.00'
  return `${r < 0 ? '−' : '+'}${rounded}`
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/** "2017-01-04" → "Jan 4". */
export function formatDate(isoDate: string | null): string {
  if (isoDate === null) return MISSING
  const date = new Date(`${isoDate}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? MISSING : DATE_FORMAT.format(date)
}
