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
import { correlationMatrix, describeCorrelation, noiseThreshold } from '@/state/selectors'

/** -1 is red, 0 is neutral grey, +1 is blue. */
const correlationColor = scaleLinear<string>()
  .domain([-1, 0, 1])
  .range([palette.negative, palette.neutral, palette.positive])
  .clamp(true)

const METHOD_HELP: Record<CorrelationMethod, string> = {
  pearson: 'Measures how close the points are to a straight line.',
  spearman: 'Compares rankings instead of raw values, so a few extreme experiments count for less.',
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
      title="What moves each measurement?"
      description="How strongly each input goes with each output. Click a cell to plot it."
      actions={
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          spacing={0}
          value={state.method}
          aria-label="Correlation method"
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
              className="capitalize data-[state=on]:bg-foreground data-[state=on]:text-background"
            >
              {method}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
    >
      <div
        ref={gridRef}
        role="grid"
        aria-label="Correlation between inputs and outputs"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-[minmax(10.5rem,1fr)_repeat(var(--outputs),minmax(2.75rem,4.25rem))] gap-x-0.5"
        style={{ '--outputs': dataset.outputs.length } as React.CSSProperties}
      >
        <div role="row" className="contents">
          <span role="presentation" />
          {dataset.outputs.map((output) => (
            <span
              key={output.key}
              role="columnheader"
              className="self-end px-0.5 pb-1.5 text-center text-[11px] leading-tight font-medium text-balance text-muted-foreground"
            >
              {output.key}
            </span>
          ))}
        </div>

        {families.map((group, groupIndex) =>
          group.variables.map((input, indexInGroup) => {
            const row = rowOf.get(input.key) ?? 0
            // Extra space above the first row of each family separates the groups.
            const startsGroup = indexInGroup === 0 && groupIndex > 0
            return (
              <div key={input.key} role="row" className="contents">
                <span
                  role="rowheader"
                  className={cn(
                    'flex items-center truncate pr-3 text-[13px]',
                    startsGroup ? 'mt-2' : 'mt-0.5',
                  )}
                  title={input.key}
                >
                  {input.key}
                </span>
                {dataset.outputs.map((output, column) => {
                  const r = matrix[input.key][output.key]
                  const fill = r === null ? palette.surface : correlationColor(r)
                  const isWeak = r === null || Math.abs(r) < threshold
                  const plotted = isPlotted(input.key, output.key)
                  const isTabStop = plottedCellExists ? plotted : row === 0 && column === 0
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
                          aria-label={`${input.key} and ${output.key}: ${formatCorrelation(r)}, ${describeCorrelation(r, threshold)}`}
                          onClick={() =>
                            dispatch({ type: 'setAxes', x: input.key, y: output.key })
                          }
                          style={{ backgroundColor: fill, color: readableInk(fill) }}
                          className={cn(
                            'h-7 cursor-pointer rounded-[5px] text-[11px] tabular-nums outline-none',
                            'transition-shadow hover:ring-2 hover:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring',
                            startsGroup ? 'mt-2' : 'mt-0.5',
                            r === null && 'border border-dashed',
                            plotted && 'ring-2 ring-foreground hover:ring-foreground',
                          )}
                        >
                          <span className={isWeak ? 'opacity-45' : 'font-medium'}>
                            {formatCorrelation(r)}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">
                          {input.key} × {output.key}
                        </p>
                        <p>
                          r = {formatCorrelation(r)} · {describeCorrelation(r, threshold)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )
          }),
        )}
      </div>

      <footer className="mt-4 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>−1 opposite</span>
          <span
            aria-hidden
            className="h-2 flex-1 rounded-full"
            style={{
              background: `linear-gradient(to right, ${palette.negative}, ${palette.neutral}, ${palette.positive})`,
            }}
          />
          <span>together +1</span>
        </div>
        <p>
          Based on {visible.length} of {dataset.experiments.length} experiments. Faded values are
          below ±{threshold.toFixed(2)}, too weak to tell apart from chance at this sample size.
        </p>
      </footer>
    </Panel>
  )
}
