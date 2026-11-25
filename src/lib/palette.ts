/**
 * Every colour the charts use, in one place.
 *
 * Each colour has one job:
 *  - diverging (negative / neutral / positive) shows the sign of a correlation,
 *  - sequential (one hue, light to dark) shows "how much",
 *  - series is the default colour of a data point,
 *  - the rest is chart chrome that should stay in the background.
 */
export const palette = {
  positive: '#256abf',
  neutral: '#f0efec',
  negative: '#d03b3b',

  /* Starts dark enough that the lowest point is still clearly visible on white. */
  sequentialLow: '#86b6ef',
  sequentialHigh: '#0d366b',
  /** A paler stretch of the same blue for table cells, where text sits on top of the fill. */
  tintLow: '#e6f0fd',
  tintHigh: '#6da7ec',

  series: '#2a78d6',
  /** Experiments hidden by a filter, kept as faint context. */
  context: '#d6d5cf',

  surface: '#ffffff',
  ink: '#0b0b0b',
  inkSecondary: '#52514e',
  inkMuted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
} as const
