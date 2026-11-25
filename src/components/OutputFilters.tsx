import { X } from 'lucide-react'
import { useMemo } from 'react'
import { Histogram } from '@/components/charts/Histogram'
import { Panel } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { Variable } from '@/data'
import { formatValue } from '@/lib/format'
import { histogram } from '@/lib/stats'
import { useExplorer } from '@/state/explorerContext'
import { column, describeRange } from '@/state/selectors'

const BIN_COUNT = 12

/**
 * One range filter per measured output, in a single row above the views it
 * affects. Every filter that is active (including ones set from the command
 * bar on inputs) appears as a removable chip.
 */
export function OutputFilters() {
  const { dataset, state, dispatch, visible } = useExplorer()
  const activeKeys = Object.keys(state.filters)

  return (
    <Panel
      title="Filter by measurement"
      description={
        <>
          Drag a range to keep only the experiments that measured inside it.{' '}
          <span className="font-medium text-foreground">
            {visible.length} of {dataset.experiments.length}
          </span>{' '}
          shown.
        </>
      }
      actions={
        activeKeys.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {activeKeys.map((key) => {
              const variable = dataset.variable(key)
              if (!variable) return null
              return (
                <Button
                  key={key}
                  variant="secondary"
                  size="sm"
                  aria-label={`Remove filter on ${key}`}
                  onClick={() => dispatch({ type: 'setFilter', key, range: null })}
                >
                  <span>
                    {key}{' '}
                    <span className="tabular-nums">{describeRange(variable, state.filters[key])}</span>
                  </span>
                  <X aria-hidden />
                </Button>
              )
            })}
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'clearFilters' })}>
              Clear filters
            </Button>
          </div>
        )
      }
    >
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
        {dataset.outputs.map((output) => (
          <RangeFilter key={output.key} variable={output} />
        ))}
      </div>
    </Panel>
  )
}

function RangeFilter({ variable }: { variable: Variable }) {
  const { dataset, state, dispatch, visible } = useExplorer()
  const [min, max] = variable.extent
  const range = state.filters[variable.key] ?? variable.extent
  const isActive = variable.key in state.filters

  const all = useMemo(
    () => histogram(column(dataset.experiments, variable.key), variable.extent, BIN_COUNT),
    [dataset, variable],
  )
  const shown = useMemo(
    () => histogram(column(visible, variable.key), variable.extent, BIN_COUNT),
    [visible, variable],
  )

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-sm font-medium">{variable.key}</span>
        <span className={isActive ? 'tabular-nums' : 'text-muted-foreground tabular-nums'}>
          {formatValue(range[0], variable)} – {formatValue(range[1], variable)}
        </span>
      </div>
      <Histogram
        all={all}
        shown={shown}
        label={`Distribution of ${variable.key}: ${visible.length} of ${dataset.experiments.length} experiments shown`}
      />
      <Slider
        className="mt-1.5"
        aria-label={`${variable.key} range`}
        min={min}
        max={max}
        // Step in the precision the variable was recorded with, e.g. 0.1 or 0.01.
        step={10 ** -variable.decimals}
        value={range}
        disabled={min === max}
        onValueChange={([low, high]) =>
          dispatch({
            type: 'setFilter',
            key: variable.key,
            // Dragging both handles back to the ends removes the filter.
            range: low <= min && high >= max ? null : [low, high],
          })
        }
      />
    </div>
  )
}
