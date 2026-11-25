import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Histogram } from '@/components/charts/Histogram'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { Variable } from '@/data'
import { formatValue, formatWithUnit } from '@/lib/format'
import { histogram } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { useExplorer } from '@/state/explorerContext'
import { column, describeRange } from '@/state/selectors'

const BIN_COUNT = 12

/**
 * A slim bar above the views it affects. It always shows how many
 * experiments are in play and which filters are active; the sliders
 * themselves stay tucked away until asked for, so the first thing a new
 * user sees is the data, not the controls.
 */
export function FilterBar() {
  const { dataset, state, dispatch, visible } = useExplorer()
  const panelId = useId()
  const activeKeys = Object.keys(state.filters)
  // A link that arrives with filters should show where they came from.
  const [isOpen, setIsOpen] = useState(activeKeys.length > 0)

  return (
    <section className="rounded-2xl border border-border/80 bg-card shadow-xs">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-5">
        <Button
          variant="outline"
          size="sm"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen(!isOpen)}
        >
          <SlidersHorizontal aria-hidden />
          Filter by measurement
          <ChevronDown aria-hidden className={cn('transition-transform', isOpen && 'rotate-180')} />
        </Button>

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
        {activeKeys.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'clearFilters' })}>
            Clear filters
          </Button>
        )}

        <p className="ml-auto text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{visible.length}</span> of{' '}
          {dataset.experiments.length} experiments shown
        </p>
      </div>

      {isOpen && (
        <div id={panelId} className="border-t px-4 py-5 sm:px-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Drag a handle to keep only the experiments that measured inside that range. Blue bars
            are the experiments still shown.
          </p>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
            {dataset.outputs.map((output) => (
              <RangeFilter key={output.key} variable={output} />
            ))}
          </div>
        </div>
      )}
    </section>
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
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{variable.key}</span>
        <span
          className={cn('text-xs tabular-nums', isActive ? 'font-medium' : 'text-muted-foreground')}
        >
          {formatValue(range[0], variable)} – {formatWithUnit(range[1], variable)}
        </span>
      </div>
      <Histogram
        all={all}
        shown={shown}
        label={`Distribution of ${variable.key}: ${visible.length} of ${dataset.experiments.length} experiments shown`}
      />
      <Slider
        className="mt-2"
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
