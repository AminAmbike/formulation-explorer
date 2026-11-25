import { useMemo } from 'react'
import { Panel } from '@/components/Panel'
import { formatValue } from '@/lib/format'
import { palette } from '@/lib/palette'
import { useExplorer } from '@/state/explorerContext'
import { activeSubset, subsetProfile, type ProfileRow } from '@/state/selectors'

const ROWS_SHOWN = 6
/** A shift of this many standard deviations fills the whole half of the bar. */
const FULL_BAR_SHIFT = 3

/**
 * Answers "which inputs produced these results?": for the experiments the
 * user has filtered to or selected, the inputs whose average differs most
 * from the dataset as a whole.
 */
export function SubsetProfile() {
  const { dataset, state, dispatch, visible } = useExplorer()

  const subset = useMemo(() => activeSubset(dataset, state, visible), [dataset, state, visible])
  const rows = useMemo(
    () => (subset ? subsetProfile(dataset, subset.experiments).slice(0, ROWS_SHOWN) : []),
    [dataset, subset],
  )

  return (
    <Panel
      title="What sets these experiments apart?"
      description={
        subset
          ? `Inputs whose average in the ${subset.experiments.length} ${
              subset.source === 'selection' ? 'selected' : 'filtered'
            } experiments differs most from all ${dataset.experiments.length}. Click one to plot it.`
          : 'Filter by a measurement above, or select points or rows, to see which inputs those experiments have in common.'
      }
    >
      {rows.length > 0 && (
        <ul className="grid gap-1">
          {rows.map((row) => (
            <li key={row.variable.key}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'setX', key: row.variable.key })}
                className="grid w-full cursor-pointer grid-cols-[11rem_minmax(4rem,1fr)_auto] items-center gap-3 rounded-md px-1.5 py-1 text-left text-[13px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate">{row.variable.key}</span>
                <ShiftBar shift={row.shift} />
                <span className="text-xs text-muted-foreground tabular-nums">
                  <span className="font-medium text-foreground">
                    {formatValue(row.subsetMean, row.variable)}
                  </span>{' '}
                  vs {formatValue(row.overallMean, row.variable)} overall
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** A bar growing right (higher than usual) or left (lower than usual) from a centre line. */
function ShiftBar({ shift }: Pick<ProfileRow, 'shift'>) {
  const size = (Math.min(Math.abs(shift), FULL_BAR_SHIFT) / FULL_BAR_SHIFT) * 50
  const isHigher = shift > 0

  return (
    <span aria-hidden className="relative h-3">
      <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
      <span
        className="absolute inset-y-0.5 rounded-sm"
        style={{
          width: `${size}%`,
          left: isHigher ? '50%' : `${50 - size}%`,
          backgroundColor: isHigher ? palette.positive : palette.negative,
        }}
      />
    </span>
  )
}
