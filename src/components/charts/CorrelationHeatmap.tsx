import { scaleLinear } from 'd3-scale'
import { useMemo, useRef, type KeyboardEvent } from 'react'
import { Panel } from '@/components/Panel'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { groupByFamily } from '@/data'
import { readableInk } from '@/lib/color'
import { formatCorrelation } from '@/lib/format'
import { palette } from '@/lib/palette'
import type { CorrelationMethod } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { useExplorer } from '@/state/explorerContext'
import { correlationMatrix, noiseThreshold, readCorrelation } from '@/state/selectors'

/** -1 is full red, +1 is full blue, and the colour thins out towards the card's own white at 0. */
const correlationColor = scaleLinear<string>()
  .domain([-1, 0, 1])
  .range([palette.negative, palette.surface, palette.positive])
  .clamp(true)

/** Even a correlation of zero keeps this much colour, so no cell ever looks empty. */
const MIN_STRENGTH = 0.12
/** The faintest a number is drawn, so weak values stay readable. */
const MIN_TEXT_OPACITY = 0.55

/** How saturated a cell is, from MIN_STRENGTH up to 1, following the size of r. */
function saturation(r: number): number {
  return MIN_STRENGTH + (1 - MIN_STRENGTH) * Math.abs(r)
}

const METHOD_HELP: Record<CorrelationMethod, string> = {
  pearson: 'Pearson: how close the experiments are to a straight line. The usual choice.',
  spearman:
    'Spearman: compares rankings instead of raw values, so a few extreme experiments count for less.',
}

const ARROW_STEPS: Record<string, [rowStep: number, columnStep: number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/**
 * Input × output grid of correlations. It is the map of the dataset: the
 * strongly coloured cells are the relationships worth looking at, and
 * clicking one opens it in the scatterplot.
 *
 * Every cell shows its value. How strong the colour and the number are
 * follows the strength of the correlation, so weak links recede without
 * disappearing, and links strong enough to trust are set in bold.
 */
export function CorrelationHeatmap() {
  const { dataset, state, dispatch, visible } = useExplorer()
  const gridRef = useRef<HTMLDivElement>(null)

  const matrix = useMemo(
    () => correlationMatrix(dataset, visible, state.method),
    [dataset, visible, state.method],
  )
  const threshold = noiseThreshold(visible.length)
  const families = useMemo(() => groupByFamily(dataset.inputs), [dataset])

  const rowOf = new Map(dataset.inputs.map((input, index) => [input.key, index]))
  const isPlotted = (inputKey: string, outputKey: string) =>
    state.x === inputKey && state.y === outputKey
  const plottedCellExists = dataset.inputs.some((input) =>
    dataset.outputs.some((output) => isPlotted(input.key, output.key)),
  )

  /** Arrow keys move between cells, so the grid is a single Tab stop instead of 95. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_STEPS[event.key]
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-row]')
    if (!step || !cell) return
    const row = Number(cell.dataset.row) + step[0]
    const column = Number(cell.dataset.column) + step[1]
    const next = gridRef.current?.querySelector<HTMLElement>(
      `[data-row="${row}"][data-column="${column}"]`,
    )
    if (next) {
      event.preventDefault()
      next.focus()
    }
  }

  return (
    <Panel
      step={1}
      title="Spot a relationship"
      description="Each cell links an input (row) to a measured output (column). Blue means they rise together, red means one falls as the other rises. Click a cell to plot it."
    >
      <div
        ref={gridRef}
        role="grid"
        aria-label="Correlation between inputs and outputs"
        onKeyDown={handleKeyDown}
        // On phones the input names may truncate (the full name is in the tooltip) so the grid still fits.
        className="grid grid-cols-[minmax(5.5rem,1fr)_repeat(var(--outputs),minmax(2.25rem,4.25rem))] gap-x-1 sm:grid-cols-[minmax(10.5rem,1fr)_repeat(var(--outputs),minmax(2.75rem,4.25rem))]"
        style={{ '--outputs': dataset.outputs.length } as React.CSSProperties}
      >
        <div role="row" className="contents">
          <span role="presentation" />
          {dataset.outputs.map((output) => (
            <span
              key={output.key}
              role="columnheader"
              className="self-end px-0.5 pb-2 text-center text-xs leading-tight font-medium text-balance"
            >
              {output.key}
            </span>
          ))}
        </div>

        {families.map((group, groupIndex) =>
          group.variables.map((input, indexInGroup) => {
            const row = rowOf.get(input.key) ?? 0
            // Extra space above the first row of each family separates the groups.
            const rowGap = indexInGroup === 0 && groupIndex > 0 ? 'mt-2.5' : 'mt-0.5'
            return (
              <div key={input.key} role="row" className="contents">
                <span
                  role="rowheader"
                  className={cn('flex items-center truncate pr-3 text-sm', rowGap)}
                  title={input.key}
                >
                  {input.key}
                </span>
                {dataset.outputs.map((output, column) => {
                  const r = matrix[input.key][output.key]
                  const isTrusted = r !== null && Math.abs(r) >= threshold
                  const strength = r === null ? 0 : saturation(r)
                  const fill =
                    r === null ? palette.surface : correlationColor(Math.sign(r) * strength)
                  const plotted = isPlotted(input.key, output.key)
                  const isTabStop = plottedCellExists ? plotted : row === 0 && column === 0
                  const reading = readCorrelation(r, visible.length)
                  return (
                    <Tooltip key={output.key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          role="gridcell"
                          data-row={row}
                          data-column={column}
                          tabIndex={isTabStop ? 0 : -1}
                          aria-pressed={plotted}
                          aria-label={`${input.key} and ${output.key}: ${reading.headline}, correlation ${formatCorrelation(r)}`}
                          onClick={() =>
                            dispatch({ type: 'setAxes', x: input.key, y: output.key })
                          }
                          style={{ backgroundColor: fill, color: readableInk(fill) }}
                          className={cn(
                            'h-6 cursor-pointer rounded-md text-xs tabular-nums outline-none',
                            isTrusted ? 'font-semibold' : 'font-normal',
                            'transition-shadow hover:ring-2 hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-brand',
                            rowGap,
                            r === null && 'border border-dashed',
                            plotted && 'ring-2 ring-foreground ring-offset-1 hover:ring-foreground',
                          )}
                        >
                          <span style={{ opacity: Math.max(MIN_TEXT_OPACITY, strength) }}>
                            {formatCorrelation(r)}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        <p className="font-medium">
                          {input.key} × {output.key}
                        </p>
                        <p>
                          {reading.headline} · correlation {formatCorrelation(r)}
                        </p>
                        {reading.caveat && <p className="opacity-80">{reading.caveat}.</p>}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )
          }),
        )}
      </div>

      <footer className="mt-4 space-y-2.5 border-t pt-3.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <span>Opposite</span>
          <span
            aria-hidden
            className="h-2 flex-1 rounded-full"
            style={{
              background: `linear-gradient(to right, ${palette.negative}, ${palette.surface}, ${palette.positive})`,
            }}
          />
          <span>Together</span>
        </div>
        <p className="text-pretty">
          Numbers are correlations, from −1 to +1. The stronger the link, the stronger the colour.
          Bold numbers are at ±{threshold.toFixed(2)} or beyond, strong enough to trust with{' '}
          {visible.length} experiments.
        </p>
        <div className="flex items-center gap-2">
          <span>Method</span>
          <ToggleGroup
            type="single"
            size="sm"
            spacing={1}
            value={state.method}
            aria-label="Correlation method"
            className="rounded-lg bg-muted p-0.5"
            // Radix reports an empty string when the active item is clicked again; ignore that.
            onValueChange={(method) =>
              method && dispatch({ type: 'setMethod', method: method as CorrelationMethod })
            }
          >
            {(['pearson', 'spearman'] as const).map((method) => (
              // A native title, not a Tooltip: Radix Tooltip and Toggle both set data-state
              // on the same element, which would hide the toggle's "on" styling.
              <ToggleGroupItem
                key={method}
                value={method}
                title={METHOD_HELP[method]}
                className="h-6 min-w-0 rounded-md px-2.5 text-xs capitalize hover:bg-transparent data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs"
              >
                {method}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </footer>
    </Panel>
  )
}
