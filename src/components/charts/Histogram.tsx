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
    <div role="img" aria-label={label} className="flex h-10 items-end gap-0.5">
      {all.map((count, index) => (
        <div
          key={index}
          className="relative flex-1 rounded-t-[3px]"
          style={{ height: `${(count / tallest) * 100}%`, backgroundColor: palette.context }}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[3px]"
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
