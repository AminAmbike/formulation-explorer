import { useMemo } from 'react'
import type { Variable } from '@/data'
import { formatWithUnit } from '@/lib/format'
import { palette } from '@/lib/palette'
import { useExplorer } from '@/state/explorerContext'
import { activeSubset, subsetProfile, type ProfileRow } from '@/state/selectors'

const ROWS_SHOWN = 5
/**
 * An input is only worth listing if the group's average sits at least this
 * many standard deviations from the overall average. Below that the group
 * is, for practical purposes, typical on that input.
 */
const MIN_SHIFT = 0.5

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
    () =>
      subset
        ? subsetProfile(dataset, subset.experiments)
            .filter((row) => Math.abs(row.shift) >= MIN_SHIFT)
            .slice(0, ROWS_SHOWN)
        : [],
    [dataset, subset],
  )

  const count = subset?.experiments.length ?? 0
  const total = dataset.experiments.length
  const which = subset?.source === 'selection' ? 'open' : 'filtered'
  const group = `${count} ${which} experiment${count === 1 ? '' : 's'}`

  return (
    <aside className="self-start rounded-xl border bg-muted/40 p-5 lg:sticky lg:top-4">
      <h3 className="font-semibold">What do they have in common?</h3>

      {subset === null ? (
        <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
          Open a few experiments, or filter by a measurement, and the ingredients that set them
          apart will be listed here.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
          The {group} {count === 1 ? 'is' : 'are'} close to the average of all {total} on every
          input, so nothing sets them apart. Narrow the filter, or open fewer experiments.
        </p>
      ) : (
        <>
          <p className="mt-1.5 mb-4 text-sm text-pretty text-muted-foreground">
            Where the {group} {count === 1 ? 'differs' : 'differ'} most from the average of all{' '}
            {total}. Click one to plot it.
          </p>
          <ul className="grid gap-2">
            {rows.map((row) => (
              <li key={row.variable.key}>
                <button
                  type="button"
                  title={`Plot ${row.variable.key}`}
                  onClick={() => dispatch({ type: 'setX', key: row.variable.key })}
                  className="-mx-2 block w-[calc(100%+1rem)] cursor-pointer rounded-lg px-2 py-2 text-left text-sm outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{row.variable.key}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-semibold">
                        {formatWithUnit(row.subsetMean, row.variable)}
                      </span>
                      <span className="text-muted-foreground">
                        {' '}
                        vs {formatWithUnit(row.overallMean, row.variable)}
                      </span>
                    </span>
                  </span>
                  <ComparisonTrack row={row} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: palette.series }}
              />
              These experiments
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-0.5 rounded-full bg-foreground/50" />
              All {total}, on average
            </span>
          </p>
        </>
      )}
    </aside>
  )
}

/** Where a value falls along a variable's full range, from 0 to 1. */
function positionOf(value: number, variable: Variable): number {
  const [min, max] = variable.extent
  return max === min ? 0.5 : Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/**
 * A line across the input's full range with two marks on it: a tick for the
 * overall average and a dot for this group's average, joined by a bar. The
 * gap between them is the difference, in the input's own units.
 */
function ComparisonTrack({ row }: { row: ProfileRow }) {
  const group = positionOf(row.subsetMean, row.variable) * 100
  const overall = positionOf(row.overallMean, row.variable) * 100

  return (
    <span aria-hidden className="relative mt-2 block h-4">
      <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-foreground/10" />
      <span
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
        style={{
          left: `${Math.min(group, overall)}%`,
          width: `${Math.abs(group - overall)}%`,
          backgroundColor: palette.sequentialLow,
        }}
      />
      <span
        className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/50"
        style={{ left: `${overall}%` }}
      />
      <span
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
        style={{ left: `${group}%`, backgroundColor: palette.series }}
      />
    </span>
  )
}
