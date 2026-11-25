import { palette } from '@/lib/palette'

interface Props {
  /** Experiments per bin across the whole dataset. */
  all: number[]
  /** Experiments per bin that pass the current filters. Same length as `all`. */
  shown: number[]
  label: string
}

/**
 * A small bar chart of how the experiments are spread over a variable's range.
 * Grey is the whole dataset; blue is the part that passes the filters, so
 * narrowing one measurement shows its effect on all the others.
 */
export function Histogram({ all, shown, label }: Props) {
  const tallest = Math.max(1, ...all)

  return (
    <div role="img" aria-label={label} className="flex h-11 items-end gap-0.5 border-b">
      {all.map((count, index) => (
        // Bars are rounded at the data end and square where they meet the baseline.
        <div
          key={index}
          className="relative flex-1 overflow-hidden rounded-t-sm"
          style={{ height: `${(count / tallest) * 100}%`, backgroundColor: palette.context }}
        >
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: count > 0 ? `${(shown[index] / count) * 100}%` : 0,
              backgroundColor: palette.series,
            }}
          />
        </div>
      ))}
    </div>
  )
}
