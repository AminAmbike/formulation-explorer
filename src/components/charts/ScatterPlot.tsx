import { scaleLinear } from 'd3-scale'
import { ArrowLeftRight } from 'lucide-react'
import { useId, useMemo, type PointerEvent } from 'react'
import { Panel } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { VariableSelect } from '@/components/VariableSelect'
import type { Experiment, Variable } from '@/data'
import { localPoint, useBrush } from '@/hooks/useBrush'
import { useElementSize } from '@/hooks/useElementSize'
import { formatCorrelation, formatDate, formatValue } from '@/lib/format'
import { palette } from '@/lib/palette'
import { correlation, linearFit } from '@/lib/stats'
import { useExplorer } from '@/state/explorerContext'
import { useHover } from '@/state/hoverContext'
import { column, describeCorrelation, noiseThreshold } from '@/state/selectors'
import { Axis } from './Axis'
import { ColorLegend } from './ColorLegend'
import { nearestPoint, pointsInRect, type Point } from './geometry'

const HEIGHT = 380
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
export function ScatterPlot() {
  const { dataset, state, dispatch, visible } = useExplorer()
  const xVariable = dataset.variable(state.x)
  const yVariable = dataset.variable(state.y)
  const colorVariable = state.colorBy ? dataset.variable(state.colorBy) : undefined

  if (!xVariable || !yVariable) return null

  const r = correlation(state.method, column(visible, state.x), column(visible, state.y))
  const reading = describeCorrelation(r, noiseThreshold(visible.length))

  return (
    <Panel
      title={`${yVariable.key} against ${xVariable.key}`}
      description={
        <>
          <span className="tabular-nums">r = {formatCorrelation(r)}</span> · {reading} ·{' '}
          {visible.length} of {dataset.experiments.length} experiments
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Y</span>
          <VariableSelect
            label="Vertical axis"
            value={state.y}
            onChange={(key) => key && dispatch({ type: 'setY', key })}
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
          <span className="text-muted-foreground">X</span>
          <VariableSelect
            label="Horizontal axis"
            value={state.x}
            onChange={(key) => key && dispatch({ type: 'setX', key })}
          />
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
        {colorVariable && <ColorLegend variable={colorVariable} />}
      </div>

      <ScatterCanvas xVariable={xVariable} yVariable={yVariable} colorVariable={colorVariable} />

      <p className="mt-2 text-xs text-muted-foreground">
        Click a point to select it, or drag across the plot to select several.
      </p>
    </Panel>
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
  const [containerRef, { width }] = useElementSize<HTMLDivElement>()
  const clipId = useId()

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom

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
    <div ref={containerRef} className="relative" style={{ height: HEIGHT }}>
      {/* Nothing is drawn until the container has been measured. */}
      {plotWidth > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Scatterplot of ${yVariable.key} against ${xVariable.key} for ${shown.length} experiments`}
          // Absolutely positioned so the SVG's own width never stops the container from shrinking.
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
              label={xVariable.key}
            />
            <Axis
              scale={yScale}
              orientation="left"
              width={plotWidth}
              height={plotHeight}
              label={yVariable.key}
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
                    r={POINT_RADIUS}
                    fill={fillOf(point.experiment)}
                    // A ring in the surface colour keeps overlapping points readable.
                    stroke={isSelected ? palette.ink : palette.surface}
                    strokeWidth={isSelected ? 2 : 1.5}
                    opacity={hasSelection && !isSelected ? 0.3 : 1}
                  />
                )
              })}

              {hovered && (
                <circle
                  cx={hovered.x}
                  cy={hovered.y}
                  r={POINT_RADIUS + 4.5}
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
  const shiftY = point.y < 110 ? '16px' : 'calc(-100% - 16px)'
  // The same variable can be on an axis and the colour; list it once.
  const rows = variables.filter((variable, index) => variables.indexOf(variable) === index)

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
      style={{
        left: MARGIN.left + point.x,
        top: MARGIN.top + point.y,
        transform: `translate(${shiftX}, ${shiftY})`,
      }}
    >
      <p className="mb-1 font-medium">
        {experiment.name}
        <span className="font-normal text-muted-foreground"> · {formatDate(experiment.date)}</span>
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
        {rows.map((variable) => (
          <div key={variable.key} className="contents">
            <dt className="text-muted-foreground">{variable.key}</dt>
            <dd className="text-right font-medium tabular-nums">
              {formatValue(experiment.values[variable.key], variable)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
