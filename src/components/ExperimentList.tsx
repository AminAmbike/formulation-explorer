import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react'
import { memo, useMemo, type Dispatch } from 'react'
import { Panel } from '@/components/Panel'
import { SubsetProfile } from '@/components/SubsetProfile'
import { Button } from '@/components/ui/button'
import { PROCESS_FAMILY, type Dataset, type Experiment, type Variable } from '@/data'
import { formatDate, formatValue, formatWithUnit } from '@/lib/format'
import { palette } from '@/lib/palette'
import { cn } from '@/lib/utils'
import { useExplorer } from '@/state/explorerContext'
import { useHover } from '@/state/hoverContext'
import { sortExperiments } from '@/state/selectors'
import type { Action, SortOrder } from '@/state/viewState'

/**
 * One compact row per experiment. Opening a row shows its full recipe and
 * results, and any number can be open at once to compare them.
 *
 * "Open" and "selected" are the same thing: opening a row highlights that
 * experiment in the scatterplot, and clicking or dragging over dots in the
 * scatterplot opens their rows here.
 */
export function ExperimentList() {
  const { dataset, state, dispatch, visible } = useExplorer()
  const { hoveredId, setHoveredId } = useHover()

  const rows = useMemo(() => sortExperiments(visible, state.sort), [visible, state.sort])
  const openIds = useMemo(() => new Set(state.selection), [state.selection])
  const openCount = rows.filter((experiment) => openIds.has(experiment.id)).length

  /** Largest amount of any single ingredient, so recipe bars share one scale across rows. */
  const largestAmount = useMemo(
    () => Math.max(1, ...ingredientsOf(dataset).map((ingredient) => ingredient.extent[1])),
    [dataset],
  )

  // The command bar can sort by an input, which has no column here; say so instead of hiding it.
  const sortedByHiddenColumn =
    state.sort.key !== 'date' && !dataset.outputs.some((output) => output.key === state.sort.key)

  return (
    <Panel
      id="experiments"
      step={3}
      title="Open an experiment"
      description={
        <>
          Click a row to see its full recipe and results. Open as many as you like to compare them.
          {sortedByHiddenColumn && ` Sorted by ${state.sort.key}.`}
        </>
      }
      actions={
        openCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'setSelection', ids: [] })}
          >
            Close all ({openCount})
          </Button>
        )
      }
    >
      {/* The summary sits beside the list, so opening a row never shifts the list itself. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No experiments match the current filters.
          </p>
        ) : (
          // Scrolls sideways on narrow screens.
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <HeaderCell sortKey="date" sort={state.sort} dispatch={dispatch} align="left">
                    Experiment
                  </HeaderCell>
                  {dataset.outputs.map((output) => (
                    <HeaderCell
                      key={output.key}
                      sortKey={output.key}
                      sort={state.sort}
                      dispatch={dispatch}
                      unit={output.unit}
                    >
                      {output.key}
                    </HeaderCell>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((experiment) => (
                  <ExperimentRow
                    key={experiment.id}
                    experiment={experiment}
                    dataset={dataset}
                    largestAmount={largestAmount}
                    isHovered={experiment.id === hoveredId}
                    isOpen={openIds.has(experiment.id)}
                    dispatch={dispatch}
                    setHoveredId={setHoveredId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <SubsetProfile />
      </div>
    </Panel>
  )
}

/** Inputs that are amounts of an ingredient, as opposed to process settings. */
function ingredientsOf(dataset: Dataset): Variable[] {
  return dataset.inputs.filter((input) => input.family !== PROCESS_FAMILY)
}

interface HeaderCellProps {
  sortKey: string
  sort: SortOrder
  dispatch: Dispatch<Action>
  align?: 'left' | 'right'
  unit?: string
  children: string
}

/** A column heading that sorts the list when clicked. */
function HeaderCell({ sortKey, sort, dispatch, align = 'right', unit, children }: HeaderCellProps) {
  const isSorted = sort.key === sortKey
  const SortIcon = sort.direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <th
      scope="col"
      aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(
        'border-b px-3 pb-2 align-bottom font-medium',
        align === 'left' ? 'pl-9 text-left' : 'text-right',
      )}
    >
      <button
        type="button"
        title={`Sort by ${children}`}
        onClick={() => dispatch({ type: 'toggleSort', key: sortKey })}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1 rounded-sm text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand',
          isSorted ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {isSorted && <SortIcon aria-hidden className="size-3 shrink-0" />}
        <span>
          {children}
          {unit && <span className="font-normal text-muted-foreground"> ({unit})</span>}
        </span>
      </button>
    </th>
  )
}

interface RowProps {
  experiment: Experiment
  dataset: Dataset
  largestAmount: number
  isHovered: boolean
  isOpen: boolean
  dispatch: Dispatch<Action>
  setHoveredId: (id: string | null) => void
}

/**
 * Memoised so that moving the pointer re-renders only the two rows whose
 * hover state changed, not all of them.
 */
const ExperimentRow = memo(function ExperimentRow({
  experiment,
  dataset,
  largestAmount,
  isHovered,
  isOpen,
  dispatch,
  setHoveredId,
}: RowProps) {
  const detailId = `detail-${experiment.id}`
  const background = isOpen ? 'bg-selected' : isHovered ? 'bg-muted/70' : undefined

  return (
    <>
      <tr
        onClick={() => dispatch({ type: 'toggleSelected', id: experiment.id })}
        onPointerEnter={() => setHoveredId(experiment.id)}
        onPointerLeave={() => setHoveredId(null)}
        className={cn('cursor-pointer transition-colors', background)}
      >
        <th scope="row" className={cn('px-3 py-2.5 text-left font-normal', !isOpen && 'border-b')}>
          {/* The click bubbles up to the row; the button is here so the keyboard can reach it. */}
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={detailId}
            className="flex cursor-pointer items-center gap-2 rounded-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-90',
              )}
            />
            <span className="font-medium">{experiment.name}</span>
            <span className="text-muted-foreground">{formatDate(experiment.date)}</span>
          </button>
        </th>
        {dataset.outputs.map((output) => (
          <td
            key={output.key}
            className={cn('px-3 py-2.5 text-right tabular-nums', !isOpen && 'border-b')}
          >
            {formatValue(experiment.values[output.key], output)}
          </td>
        ))}
      </tr>

      {isOpen && (
        <tr id={detailId} className="bg-selected">
          <td colSpan={dataset.outputs.length + 1} className="border-b px-3 pt-1 pb-4">
            <ExperimentDetail
              experiment={experiment}
              dataset={dataset}
              largestAmount={largestAmount}
            />
          </td>
        </tr>
      )}
    </>
  )
})

// Fixed label and value columns, so the bars line up from one open experiment to the next.
const RECIPE_GRID = 'grid grid-cols-[10.5rem_minmax(3rem,1fr)_3.25rem] items-center gap-x-3 gap-y-2'
const RESULTS_GRID = 'grid grid-cols-[8.5rem_minmax(3rem,1fr)_5.5rem] items-center gap-x-3 gap-y-2'

interface DetailProps {
  experiment: Experiment
  dataset: Dataset
  largestAmount: number
}

/** What went into one experiment and what came out of it. */
function ExperimentDetail({ experiment, dataset, largestAmount }: DetailProps) {
  const used = ingredientsOf(dataset).filter((input) => (experiment.values[input.key] ?? 0) > 0)
  const settings = dataset.inputs.filter((input) => input.family === PROCESS_FAMILY)

  return (
    <div className="grid gap-x-10 gap-y-6 rounded-xl border bg-card p-4 sm:p-5 md:grid-cols-2">
      <section>
        <h3 className="text-sm font-semibold">Recipe</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          The {used.length} ingredients this experiment used, as a share of the mix.
        </p>
        <dl className={RECIPE_GRID}>
          {used.map((input) => {
            const amount = experiment.values[input.key] ?? 0
            return (
              <div key={input.key} className="contents">
                <dt className="truncate">{input.key}</dt>
                {/* A thin meter: the track is a paler step of the fill's own blue. */}
                <span
                  aria-hidden
                  className="h-2 overflow-hidden rounded-full"
                  style={{ backgroundColor: palette.tintLow }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(amount / largestAmount) * 100}%`,
                      backgroundColor: palette.series,
                    }}
                  />
                </span>
                <dd className="text-right font-medium tabular-nums">
                  {formatWithUnit(amount, input)}
                </dd>
              </div>
            )
          })}
        </dl>
        {settings.length > 0 && (
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t pt-3">
            {settings.map((setting) => (
              <div key={setting.key} className="flex gap-2">
                <dt className="text-muted-foreground">{setting.key}</dt>
                <dd className="font-medium tabular-nums">
                  {formatWithUnit(experiment.values[setting.key], setting)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold">Results</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          The dot shows where each result falls between the lowest and highest of all{' '}
          {dataset.experiments.length} experiments.
        </p>
        <dl className={RESULTS_GRID}>
          {dataset.outputs.map((output) => (
            <div key={output.key} className="contents">
              <dt className="truncate">{output.key}</dt>
              <RangeMarker value={experiment.values[output.key] ?? null} variable={output} />
              <dd className="text-right font-medium tabular-nums">
                {formatWithUnit(experiment.values[output.key], output)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

/**
 * A dot on a line running from the variable's lowest value to its highest.
 * A dot, not a bar: these measurements do not start at zero, so a bar's
 * length would mislead.
 */
function RangeMarker({ value, variable }: { value: number | null; variable: Variable }) {
  const [min, max] = variable.extent
  const position = value === null || max === min ? null : (value - min) / (max - min)

  return (
    <span
      aria-hidden
      title={`Lowest ${formatWithUnit(min, variable)}, highest ${formatWithUnit(max, variable)}`}
      className="relative mx-1.5 h-2"
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      {position !== null && (
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
          style={{ left: `${position * 100}%`, backgroundColor: palette.series }}
        />
      )}
    </span>
  )
}
