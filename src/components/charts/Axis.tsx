import type { ScaleLinear } from 'd3-scale'
import { palette } from '@/lib/palette'

interface Props {
  scale: ScaleLinear<number, number>
  orientation: 'bottom' | 'left'
  /** Size of the plot area the axis belongs to. */
  width: number
  height: number
  label: string
}

/** Gridlines, tick labels and a title for one side of a plot. */
export function Axis({ scale, orientation, width, height, label }: Props) {
  const isBottom = orientation === 'bottom'
  // Aim for a tick roughly every 80px across and every 56px up.
  const tickCount = Math.max(2, Math.floor(isBottom ? width / 80 : height / 56))
  const ticks = scale.ticks(tickCount)
  const format = scale.tickFormat(tickCount)

  return (
    <g fontSize={11} fill={palette.inkMuted} className="tabular-nums">
      {ticks.map((tick) => {
        const position = scale(tick)
        return isBottom ? (
          <g key={tick} transform={`translate(${position},0)`}>
            <line y2={height} stroke={palette.grid} />
            <text y={height + 18} textAnchor="middle">
              {format(tick)}
            </text>
          </g>
        ) : (
          <g key={tick} transform={`translate(0,${position})`}>
            <line x2={width} stroke={palette.grid} />
            <text x={-10} dy="0.32em" textAnchor="end">
              {format(tick)}
            </text>
          </g>
        )
      })}
      <text
        fontSize={12}
        fontWeight={500}
        fill={palette.inkSecondary}
        textAnchor="middle"
        transform={
          isBottom
            ? `translate(${width / 2},${height + 40})`
            : `translate(-46,${height / 2}) rotate(-90)`
        }
      >
        {label}
      </text>
    </g>
  )
}
