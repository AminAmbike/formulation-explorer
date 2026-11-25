import type { Variable } from '@/data'
import { formatValue } from '@/lib/format'
import { palette } from '@/lib/palette'

/** Explains what the point colours mean when "Colour by" is on. */
export function ColorLegend({ variable }: { variable: Variable }) {
  const [min, max] = variable.extent
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
      <span className="font-medium text-foreground">{variable.key}</span>
      <span>{formatValue(min, variable)}</span>
      <span
        aria-hidden
        className="h-2 w-24 rounded-full"
        style={{
          background: `linear-gradient(to right, ${palette.sequentialLow}, ${palette.sequentialHigh})`,
        }}
      />
      <span>{formatValue(max, variable)}</span>
    </div>
  )
}
