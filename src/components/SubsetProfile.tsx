import { useMemo } from 'react'
import { formatWithUnit } from '@/lib/format'
import { palette } from '@/lib/palette'
import { useExplorer } from '@/state/explorerContext'
import { activeSubset, subsetProfile, type ProfileRow } from '@/state/selectors'

const ROWS_SHOWN = 5
/** A shift of this many standard deviations fills the whole half of the bar. */
const FULL_BAR_SHIFT = 3

/**
 * Answers "which inputs produced these results?": for the experiments the
 * user has opened or filtered to, the inputs whose average differs most
 * from the dataset as a whole.
 *
 * It sits beside the experiment list and is always present, so opening a
 * row never pushes the list around to make room for it.
 */
export function SubsetProfile() {
  const { dataset, state, dispatch, visible } = useExplorer()

  const subset = useMemo(() => activeSubset(dataset, state, visible), [dataset, state, visible])
  const rows = useMemo(
    () => (subset ? subsetProfile(dataset, subset.experiments).slice(0, ROWS_SHOWN) : []),
    [dataset, subset],
  )

  const count = subset?.experiments.length ?? 0
  const which = subset?.source === 'selection' ? 'open' : 'filtered'

  return (
    <aside className="self-start rounded-xl border bg-muted/40 p-4 lg:sticky lg:top-4">
      <h3 className="text-sm font-semibold">What do they have in common?</h3>

      {rows.length === 0 ? (
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Open a few experiments, or filter by a measurement, and the ingredients that set them
          apart will be listed here.
        </p>
      ) : (
        <>
          <p className="mt-1 mb-3 text-xs text-pretty text-muted-foreground">
            Inputs where the {count} {which} {count === 1 ? 'experiment differs' : 'experiments differ'}{' '}
            most from the average of all {dataset.experiments.length}. Click one to plot it.
          </p>
          <ul className="grid gap-1">
            {rows.map((row) => (
              <li key={row.variable.key}>
                <button
                  type="button"
                  title={`Plot ${row.variable.key}`}
                  onClick={() => dispatch({ type: 'setX', key: row.variable.key })}
                  className="block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate">{row.variable.key}</span>
                    <span className="font-medium tabular-nums">
                      {formatWithUnit(row.subsetMean, row.variable)}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-3">
                    <ShiftBar shift={row.shift} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      usually {formatWithUnit(row.overallMean, row.variable)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
            <LegendSwatch color={palette.positive} label="More than usual" />
            <LegendSwatch color={palette.negative} label="Less than usual" />
          </p>
        </>
      )}
    </aside>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="h-2 w-3 rounded-xs" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

/** A bar growing right (more than usual) or left (less than usual) from a centre line. */
function ShiftBar({ shift }: Pick<ProfileRow, 'shift'>) {
  const size = (Math.min(Math.abs(shift), FULL_BAR_SHIFT) / FULL_BAR_SHIFT) * 50
  const isHigher = shift > 0

  return (
    <span aria-hidden className="relative h-3 flex-1">
      <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/25" />
      <span
        // Rounded at the data end, square where it meets the centre line.
        className={isHigher ? 'absolute inset-y-0.5 rounded-r-sm' : 'absolute inset-y-0.5 rounded-l-sm'}
        style={{
          width: `${size}%`,
          left: isHigher ? '50%' : `${50 - size}%`,
          backgroundColor: isHigher ? palette.positive : palette.negative,
        }}
      />
    </span>
  )
}
