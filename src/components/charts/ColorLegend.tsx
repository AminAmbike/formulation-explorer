import type { Variable } from '@/data'
import { formatValue, formatWithUnit } from '@/lib/format'
import { palette } from '@/lib/palette'

/** Explains what the point colours mean when "Colour by" is on. */
export function ColorLegend({ variable }: { variable: Variable }) {
  const [min, max] = variable.extent
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span className="font-medium text-foreground">{variable.key}</span>
      <span>{formatValue(min, variable)}</span>
      <span
        aria-hidden
        className="h-2 w-20 rounded-full"
        style={{
          background: `linear-gradient(to right, ${palette.sequentialLow}, ${palette.sequentialHigh})`,
        }}
      />
      <span>{formatWithUnit(max, variable)}</span>
    </span>
  )
}
