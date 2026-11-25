import { scaleLinear } from 'd3-scale'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { memo, useMemo, type Dispatch, type ReactNode } from 'react'
import { Panel } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { groupByFamily, shortLabel, type Experiment, type Variable } from '@/data'
import { readableInk } from '@/lib/color'
import { formatDate, formatValue } from '@/lib/format'
import { palette } from '@/lib/palette'
import { cn } from '@/lib/utils'
import { useExplorer } from '@/state/explorerContext'
import { useHover } from '@/state/hoverContext'
import { sortExperiments } from '@/state/selectors'
import type { Action, SortOrder } from '@/state/viewState'

/** Shading for one input column: light for its smallest value, dark for its largest. */
type Shade = (value: number) => string

/**
 * Every experiment as a row: measured outputs first, then the recipe.
 * Hovering or selecting a row highlights the same experiment in the scatterplot.
 */
export function ExperimentTable() {
  const { dataset, state, dispatch, visible } = useExplorer()
  const { hoveredId, setHoveredId } = useHover()

  const rows = useMemo(() => sortExperiments(visible, state.sort), [visible, state.sort])
  const selectedIds = useMemo(() => new Set(state.selection), [state.selection])
  const inputGroups = useMemo(() => groupByFamily(dataset.inputs), [dataset])
  const shades = useMemo(
    () =>
      new Map<string, Shade>(
        dataset.inputs.map((input) => [
          input.key,
          scaleLinear<string>()
            .domain(input.extent)
            .range([palette.tintLow, palette.tintHigh]),
        ]),
      ),
    [dataset],
  )

  const selectedCount = rows.filter((experiment) => selectedIds.has(experiment.id)).length

  return (
    <Panel
      title="Experiments"
      description={
        <>
          Showing {rows.length} of {dataset.experiments.length}. Click a column to sort and a row to
          select it. Recipe cells are shaded from each column's smallest to largest value.
        </>
      }
      actions={
        selectedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'setSelection', ids: [] })}
          >
            Clear {selectedCount} selected
          </Button>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No experiments match the current filters.
        </p>
      ) : (
        // The table scrolls sideways on narrow screens; the first column stays in place.
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <HeaderCell rowSpan={2} sortKey="date" sort={state.sort} dispatch={dispatch} sticky>
                  Experiment
                </HeaderCell>
                <GroupHeader span={dataset.outputs.length}>Measured outputs</GroupHeader>
                {inputGroups.map((group) =>
                  group.variables.length === 1 ? (
                    // A family of one needs no heading of its own.
                    <HeaderCell
                      key={group.family}
                      rowSpan={2}
                      sortKey={group.variables[0].key}
                      sort={state.sort}
                      dispatch={dispatch}
                      startsGroup
                    >
                      {group.variables[0].key}
                    </HeaderCell>
                  ) : (
                    <GroupHeader key={group.family} span={group.variables.length}>
                      {group.family}
                    </GroupHeader>
                  ),
                )}
              </tr>
              <tr>
                {dataset.outputs.map((output, index) => (
                  <HeaderCell
                    key={output.key}
                    sortKey={output.key}
                    sort={state.sort}
                    dispatch={dispatch}
                    startsGroup={index === 0}
                  >
                    {output.key}
                  </HeaderCell>
                ))}
                {inputGroups.map((group) =>
                  group.variables.length === 1
                    ? null
                    : group.variables.map((input, index) => (
                        <HeaderCell
                          key={input.key}
                          sortKey={input.key}
                          sort={state.sort}
                          dispatch={dispatch}
                          startsGroup={index === 0}
                          label={input.key}
                        >
                          {shortLabel(input)}
                        </HeaderCell>
                      )),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((experiment) => (
                <ExperimentRow
                  key={experiment.id}
                  experiment={experiment}
                  outputs={dataset.outputs}
                  inputGroups={inputGroups}
                  shades={shades}
                  isHovered={experiment.id === hoveredId}
                  isSelected={selectedIds.has(experiment.id)}
                  dispatch={dispatch}
                  setHoveredId={setHoveredId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

const GROUP_EDGE = 'border-l border-border pl-1.5'

function GroupHeader({ span, children }: { span: number; children: ReactNode }) {
  return (
    <th
      colSpan={span}
      scope="colgroup"
      className={cn('pb-1 text-left align-bottom font-medium text-muted-foreground', GROUP_EDGE)}
    >
      {children}
    </th>
  )
}

interface HeaderCellProps {
  sortKey: string
  sort: SortOrder
  dispatch: Dispatch<Action>
  rowSpan?: number
  /** Draws the divider that separates one group of columns from the next. */
  startsGroup?: boolean
  sticky?: boolean
  /** Full name for screen readers and the tooltip when the visible text is shortened. */
  label?: string
  children: string
}

/** A column heading that sorts the table when clicked. */
function HeaderCell({
  sortKey,
  sort,
  dispatch,
  rowSpan,
  startsGroup,
  sticky,
  label,
  children,
}: HeaderCellProps) {
  const isSorted = sort.key === sortKey
  const SortIcon = sort.direction === 'asc' ? ArrowUp : ArrowDown
  const name = label ?? children

  return (
    <th
      rowSpan={rowSpan}
      scope="col"
      aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(
        'border-b pb-1.5 align-bottom font-medium',
        startsGroup && GROUP_EDGE,
        sticky && 'sticky left-0 z-10 bg-card',
      )}
    >
      <button
        type="button"
        title={`Sort by ${name}`}
        aria-label={`Sort by ${name}`}
        onClick={() => dispatch({ type: 'toggleSort', key: sortKey })}
        className={cn(
          'inline-flex cursor-pointer items-end gap-0.5 rounded-sm text-left leading-tight outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
          isSorted ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {children}
        {isSorted && <SortIcon aria-hidden className="size-3 shrink-0" />}
      </button>
    </th>
  )
}

type InputGroups = ReturnType<typeof groupByFamily<Variable>>

interface RowProps {
  experiment: Experiment
  outputs: Variable[]
  inputGroups: InputGroups
  shades: Map<string, Shade>
  isHovered: boolean
  isSelected: boolean
  dispatch: Dispatch<Action>
  setHoveredId: (id: string | null) => void
}

/**
 * Memoised so that moving the pointer re-renders only the two rows whose
 * hover state changed, not all of them.
 */
const ExperimentRow = memo(function ExperimentRow({
  experiment,
  outputs,
  inputGroups,
  shades,
  isHovered,
  isSelected,
  dispatch,
  setHoveredId,
}: RowProps) {
  const toggle = () => dispatch({ type: 'toggleSelected', id: experiment.id })
  const rowBackground = isSelected ? 'bg-selected' : isHovered ? 'bg-muted' : 'bg-card'

  return (
    <tr
      onClick={toggle}
      onPointerEnter={() => setHoveredId(experiment.id)}
      onPointerLeave={() => setHoveredId(null)}
      aria-selected={isSelected}
      className={cn('cursor-pointer', rowBackground)}
    >
      <th
        scope="row"
        className={cn('sticky left-0 z-10 py-1 pr-3 text-left font-normal whitespace-nowrap', rowBackground)}
      >
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={toggle}
            // The row has its own click handler; without this a click would toggle twice.
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select ${experiment.name}, ${formatDate(experiment.date)}`}
            className="size-3.5 accent-foreground"
          />
          <span className="font-medium">{experiment.name}</span>
          <span className="text-muted-foreground">{formatDate(experiment.date)}</span>
        </label>
      </th>

      {outputs.map((output, index) => (
        <OutputCell
          key={output.key}
          variable={output}
          value={experiment.values[output.key] ?? null}
          startsGroup={index === 0}
        />
      ))}

      {inputGroups.map((group) =>
        group.variables.map((input, index) => (
          <InputCell
            key={input.key}
            variable={input}
            value={experiment.values[input.key] ?? null}
            shade={shades.get(input.key)}
            startsGroup={index === 0}
          />
        )),
      )}
    </tr>
  )
})

interface CellProps {
  variable: Variable
  value: number | null
  startsGroup: boolean
}

/** The value, plus a dot showing where it falls between the column's lowest and highest. */
function OutputCell({ variable, value, startsGroup }: CellProps) {
  const [min, max] = variable.extent
  const position = value === null || max === min ? null : (value - min) / (max - min)

  return (
    <td className={cn('py-1 pr-2 tabular-nums', startsGroup && GROUP_EDGE)}>
      <div className="flex items-center justify-end gap-1.5">
        {formatValue(value, variable)}
        <span aria-hidden className="relative h-px w-6 shrink-0 bg-border">
          {position !== null && (
            <span
              className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${position * 100}%`, backgroundColor: palette.series }}
            />
          )}
        </span>
      </div>
    </td>
  )
}

/** A shaded cell. Zero is left blank so the ingredients actually used stand out. */
function InputCell({ variable, value, shade, startsGroup }: CellProps & { shade?: Shade }) {
  const isUsed = value !== null && value !== 0
  const fill = isUsed && shade ? shade(value) : undefined

  return (
    <td className={cn('p-px', startsGroup && 'border-l border-border pl-1')}>
      <div
        className="flex h-6 min-w-8 items-center justify-center rounded-[4px] px-0.5 tabular-nums"
        style={fill ? { backgroundColor: fill, color: readableInk(fill) } : undefined}
      >
        {isUsed ? formatValue(value, variable) : <span className="sr-only">{value ?? 'missing'}</span>}
      </div>
    </td>
  )
}
