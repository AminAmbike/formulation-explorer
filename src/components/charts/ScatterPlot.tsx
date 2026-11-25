import { scaleLinear } from 'd3-scale'
import { ArrowDown, ArrowLeftRight, Info, TriangleAlert } from 'lucide-react'
import { useId, useMemo, type PointerEvent, type ReactNode } from 'react'
import { Panel } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { VariableSelect } from '@/components/VariableSelect'
import type { Experiment, Variable } from '@/data'
import { localPoint, useBrush } from '@/hooks/useBrush'
import { useElementSize } from '@/hooks/useElementSize'
import { formatCorrelation, formatDate, formatWithUnit, labelWithUnit } from '@/lib/format'
import { palette } from '@/lib/palette'
import { linearFit, pearson } from '@/lib/stats'
import { useExplorer } from '@/state/explorerContext'
import { useHover } from '@/state/hoverContext'
import { column, readCorrelation } from '@/state/selectors'
import { Axis } from './Axis'
import { ColorLegend } from './ColorLegend'
import { nearestPoint, pointsInRect, type Point } from './geometry'

const MARGIN = { top: 12, right: 16, bottom: 48, left: 60 }
/** How close the pointer has to be to a point to hover or click it. */
const HOVER_RADIUS = 28
const POINT_RADIUS = 5.5

interface PlotPoint extends Point {
  experiment: Experiment
}

/** A scale over the variable's full range, with a little room at both ends. */
function axisScale(variable: Variable, range: [number, number]) {
  const [min, max] = variable.extent
  // A variable that never changes still needs a domain wider than zero.
  const padding = (max - min) * 0.06 || 1
  return scaleLinear()
    .domain([min - padding, max + padding])
    .range(range)
}

/** Any variable against any other, with the controls to choose them. */
export function ScatterPlot({ className }: { className?: string }) {
  const { dataset, state, dispatch, visible } = useExplorer()
  const xVariable = dataset.variable(state.x)
  const yVariable = dataset.variable(state.y)
  const colorVariable = state.colorBy ? dataset.variable(state.colorBy) : undefined

  if (!xVariable || !yVariable) return null

  const r = pearson(column(visible, state.x), column(visible, state.y))
  const selected = new Set(state.selection)
  const openCount = visible.filter((experiment) => selected.has(experiment.id)).length
  const hasFilteredOut = visible.length < dataset.experiments.length

  return (
    <Panel
      step={2}
      title="See the experiments behind it"
      description="Every dot is one experiment. Click a dot to open its recipe below, or drag across the plot to open several."
      className={className}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <VariableSelect
            label="Vertical axis"
            value={state.y}
            onChange={(key) => key && dispatch({ type: 'setY', key })}
          />
          <span className="text-muted-foreground">against</span>
          <VariableSelect
            label="Horizontal axis"
            value={state.x}
            onChange={(key) => key && dispatch({ type: 'setX', key })}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Swap axes"
            title="Swap axes"
            onClick={() => dispatch({ type: 'swapAxes' })}
          >
            <ArrowLeftRight />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Colour by</span>
          <VariableSelect
            label="Colour points by"
            value={state.colorBy}
            noneLabel="Nothing"
            onChange={(key) => dispatch({ type: 'setColorBy', key })}
          />
        </div>
      </div>

      <RelationshipSummary x={xVariable} y={yVariable} r={r} experimentCount={visible.length} />

      <ScatterCanvas xVariable={xVariable} yVariable={yVariable} colorVariable={colorVariable} />

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {colorVariable ? (
          <ColorLegend variable={colorVariable} />
        ) : (
          <LegendItem label="One experiment">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: palette.series }} />
          </LegendItem>
        )}
        {hasFilteredOut && (
          <LegendItem label="Filtered out">
            <span className="size-2 rounded-full" style={{ backgroundColor: palette.context }} />
          </LegendItem>
        )}
        <LegendItem label="Trend">
          <span className="w-5 border-t-2 border-dashed" style={{ borderColor: palette.inkMuted }} />
        </LegendItem>
        {openCount > 0 && (
          <a
            href="#experiments"
            className="ml-auto inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {openCount} open below
            <ArrowDown aria-hidden className="size-3" />
          </a>
        )}
      </div>
    </Panel>
  )
}

function LegendItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-flex items-center">
        {children}
      </span>
      {label}
    </span>
  )
}

interface SummaryProps {
  x: Variable
  y: Variable
  r: number | null
  experimentCount: number
}

/**
 * Says in words what the plot shows, so nobody has to know what "r" means:
 * the strength of the relationship, which way it goes, and a warning when
 * there are too few experiments to rely on it.
 */
function RelationshipSummary({ x, y, r, experimentCount }: SummaryProps) {
  const reading = readCorrelation(r, experimentCount)
  const sentence =
    r === null
      ? 'Fewer than three experiments have both values.'
      : Math.abs(r) < 0.2
        ? `${y.key} does not move consistently with ${x.key}.`
        : `${y.key} tends to be ${r > 0 ? 'higher' : 'lower'} when ${x.key} is higher.`

  return (
    <div className="mb-4 flex items-start justify-between gap-4 rounded-xl bg-muted/60 px-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{reading.headline}</p>
        <p className="text-sm text-pretty text-muted-foreground">{sentence}</p>
        {reading.caveat && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm">
            <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
            {reading.caveat}.
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xl leading-7 font-semibold tabular-nums">{formatCorrelation(r)}</p>
        <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          correlation
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="What is correlation?"
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Info aria-hidden className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty">
              Correlation runs from −1 to +1. Near +1, the two rise together. Near −1, one falls as
              the other rises. Near 0, there is no consistent link.
            </TooltipContent>
          </Tooltip>
        </p>
      </div>
    </div>
  )
}

interface CanvasProps {
  xVariable: Variable
  yVariable: Variable
  colorVariable: Variable | undefined
}

function ScatterCanvas({ xVariable, yVariable, colorVariable }: CanvasProps) {
  const { dataset, state, dispatch, visible } = useExplorer()
  const { hoveredId, setHoveredId } = useHover()
  const [containerRef, { width, height }] = useElementSize<HTMLDivElement>()
  const clipId = useId()

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom)

  // Axes always span the whole dataset, so they hold still while filters change.
  const xScale = useMemo(() => axisScale(xVariable, [0, plotWidth]), [xVariable, plotWidth])
  const yScale = useMemo(() => axisScale(yVariable, [plotHeight, 0]), [yVariable, plotHeight])
  const colorScale = useMemo(
    () =>
      colorVariable
        ? scaleLinear<string>()
            .domain(colorVariable.extent)
            .range([palette.sequentialLow, palette.sequentialHigh])
        : null,
    [colorVariable],
  )

  const selectedIds = useMemo(() => new Set(state.selection), [state.selection])

  /** Pixel positions, split into experiments that pass the filters and those that do not. */
  const { shown, filteredOut } = useMemo(() => {
    const visibleIds = new Set(visible.map((experiment) => experiment.id))
    const shown: PlotPoint[] = []
    const filteredOut: PlotPoint[] = []
    for (const experiment of dataset.experiments) {
      const x = experiment.values[xVariable.key] ?? null
      const y = experiment.values[yVariable.key] ?? null
      if (x === null || y === null) continue
      const point = { experiment, x: xScale(x), y: yScale(y) }
      if (visibleIds.has(experiment.id)) shown.push(point)
      else filteredOut.push(point)
    }
    return { shown, filteredOut }
  }, [dataset, visible, xVariable, yVariable, xScale, yScale])

  const trend = useMemo(() => {
    const fit = linearFit(column(visible, xVariable.key), column(visible, yVariable.key))
    if (!fit) return null
    const [from, to] = xScale.domain()
    return {
      x1: xScale(from),
      y1: yScale(fit.slope * from + fit.intercept),
      x2: xScale(to),
      y2: yScale(fit.slope * to + fit.intercept),
    }
  }, [visible, xVariable, yVariable, xScale, yScale])

  const brush = useBrush({
    onBrush: (rect) =>
      dispatch({
        type: 'setSelection',
        ids: pointsInRect(shown, rect).map((point) => point.experiment.id),
      }),
    onClick: (pointer) => {
      const hit = nearestPoint(shown, pointer, HOVER_RADIUS)
      if (hit) dispatch({ type: 'toggleSelected', id: hit.experiment.id })
      else dispatch({ type: 'setSelection', ids: [] })
    },
  })

  const handlePointerMove = (event: PointerEvent<SVGRectElement>) => {
    brush.handlers.onPointerMove(event)
    if (brush.isDragging) return
    const hit = nearestPoint(shown, localPoint(event), HOVER_RADIUS)
    setHoveredId(hit?.experiment.id ?? null)
  }

  const hasSelection = shown.some((point) => selectedIds.has(point.experiment.id))
  const hovered = shown.find((point) => point.experiment.id === hoveredId)
  const fillOf = (experiment: Experiment) => {
    const value = colorVariable ? (experiment.values[colorVariable.key] ?? null) : null
    return colorScale && value !== null ? colorScale(value) : palette.series
  }

  return (
    // Fills whatever height the panel has left, so the plot lines up with the grid beside it.
    <div ref={containerRef} className="relative min-h-[380px] flex-1">
      {/* Nothing is drawn until the container has been measured. */}
      {plotWidth > 0 && plotHeight > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Scatterplot of ${yVariable.key} against ${xVariable.key} for ${shown.length} experiments`}
          // Absolutely positioned so the SVG's own size never stops the container from shrinking.
          className="absolute inset-0 select-none"
        >
          <defs>
            <clipPath id={clipId}>
              <rect width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>

          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            <Axis
              scale={xScale}
              orientation="bottom"
              width={plotWidth}
              height={plotHeight}
              label={labelWithUnit(xVariable)}
            />
            <Axis
              scale={yScale}
              orientation="left"
              width={plotWidth}
              height={plotHeight}
              label={labelWithUnit(yVariable)}
            />

            <g clipPath={`url(#${clipId})`}>
              {trend && (
                <line {...trend} stroke={palette.inkMuted} strokeWidth={1.5} strokeDasharray="5 4" />
              )}

              {filteredOut.map((point) => (
                <circle
                  key={point.experiment.id}
                  cx={point.x}
                  cy={point.y}
                  r={3.5}
                  fill={palette.context}
                />
              ))}

              {shown.map((point) => {
                const isSelected = selectedIds.has(point.experiment.id)
                return (
                  <circle
                    key={point.experiment.id}
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? POINT_RADIUS + 1 : POINT_RADIUS}
                    fill={fillOf(point.experiment)}
                    // A ring in the surface colour keeps overlapping points readable.
                    stroke={isSelected ? palette.ink : palette.surface}
                    strokeWidth={2}
                    opacity={hasSelection && !isSelected ? 0.3 : 1}
                  />
                )
              })}

              {hovered && (
                <circle
                  cx={hovered.x}
                  cy={hovered.y}
                  r={POINT_RADIUS + 5}
                  fill="none"
                  stroke={palette.ink}
                  strokeWidth={1.5}
                />
              )}

              {brush.rect && (
                <rect
                  x={brush.rect.x0}
                  y={brush.rect.y0}
                  width={brush.rect.x1 - brush.rect.x0}
                  height={brush.rect.y1 - brush.rect.y0}
                  rx={4}
                  fill={palette.series}
                  fillOpacity={0.1}
                  stroke={palette.series}
                />
              )}
            </g>

            {/* One transparent layer on top receives every pointer event for the plot. */}
            <rect
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              className="cursor-crosshair touch-none"
              {...brush.handlers}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoveredId(null)}
            />
          </g>
        </svg>
      )}

      {shown.length === 0 && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          No experiments match the current filters.
        </p>
      )}

      {hovered && !brush.isDragging && (
        <PointTooltip
          point={hovered}
          plotWidth={plotWidth}
          variables={[yVariable, xVariable, ...(colorVariable ? [colorVariable] : [])]}
        />
      )}
    </div>
  )
}

interface TooltipProps {
  point: PlotPoint
  plotWidth: number
  variables: Variable[]
}

function PointTooltip({ point, plotWidth, variables }: TooltipProps) {
  const { experiment } = point
  // Flip the tooltip away from whichever edge the point is close to.
  const shiftX = point.x < 110 ? '0%' : point.x > plotWidth - 110 ? '-100%' : '-50%'
  const shiftY = point.y < 120 ? '18px' : 'calc(-100% - 18px)'
  // The same variable can be on an axis and the colour; list it once.
  const rows = variables.filter((variable, index) => variables.indexOf(variable) === index)

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-48 rounded-xl border bg-popover px-3.5 py-2.5 text-xs shadow-lg"
      style={{
        left: MARGIN.left + point.x,
        top: MARGIN.top + point.y,
        transform: `translate(${shiftX}, ${shiftY})`,
      }}
    >
      <p className="mb-1.5 text-sm font-semibold">
        {experiment.name}
        <span className="font-normal text-muted-foreground"> · {formatDate(experiment.date)}</span>
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-1">
        {rows.map((variable) => (
          <div key={variable.key} className="contents">
            <dt className="text-muted-foreground">{variable.key}</dt>
            <dd className="text-right font-semibold tabular-nums">
              {formatWithUnit(experiment.values[variable.key], variable)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
