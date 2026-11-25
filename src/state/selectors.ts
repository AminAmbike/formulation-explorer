/**
 * Pure functions that derive what the views show from the dataset and the
 * view state. Components call these inside useMemo.
 */
import type { Dataset, Experiment, Variable } from '@/data'
import { formatValue, formatWithUnit } from '@/lib/format'
import { mean, pearson, standardDeviation } from '@/lib/stats'
import type { Range, SortOrder, ViewState } from './viewState'

/** One variable's value for each experiment, in order. */
export function column(experiments: Experiment[], key: string): (number | null)[] {
  return experiments.map((experiment) => experiment.values[key] ?? null)
}

/** Experiments that fall inside every active range. A missing value fails its filter. */
export function applyFilters(
  experiments: Experiment[],
  filters: Record<string, Range>,
): Experiment[] {
  const active = Object.entries(filters)
  if (active.length === 0) return experiments
  return experiments.filter((experiment) =>
    active.every(([key, [min, max]]) => {
      const value = experiment.values[key]
      return value !== null && value !== undefined && value >= min && value <= max
    }),
  )
}

export function sortExperiments(experiments: Experiment[], sort: SortOrder): Experiment[] {
  const sign = sort.direction === 'asc' ? 1 : -1
  const sorted = [...experiments]

  if (sort.key === 'date') {
    // Ids start with the date, so comparing ids orders by date and then by name.
    return sorted.sort((a, b) => sign * a.id.localeCompare(b.id))
  }

  return sorted.sort((a, b) => {
    const valueA = a.values[sort.key] ?? null
    const valueB = b.values[sort.key] ?? null
    // Missing values go last whichever way the column is sorted.
    if (valueA === null || valueB === null) {
      return (valueA === null ? 1 : 0) - (valueB === null ? 1 : 0)
    }
    return sign * (valueA - valueB)
  })
}

/** Correlation of every input with every output: matrix[inputKey][outputKey]. */
export type CorrelationMatrix = Record<string, Record<string, number | null>>

export function correlationMatrix(
  dataset: Dataset,
  experiments: Experiment[],
): CorrelationMatrix {
  const outputColumns = dataset.outputs.map(
    (output) => [output.key, column(experiments, output.key)] as const,
  )
  const matrix: CorrelationMatrix = {}
  for (const input of dataset.inputs) {
    const inputColumn = column(experiments, input.key)
    const row: Record<string, number | null> = {}
    for (const [outputKey, outputColumn] of outputColumns) {
      row[outputKey] = pearson(inputColumn, outputColumn)
    }
    matrix[input.key] = row
  }
  return matrix
}

/**
 * Below this, a correlation from n experiments is hard to tell apart from
 * chance. 2/sqrt(n) is the usual rule of thumb for the 5% level (0.40 at n = 25).
 */
export function noiseThreshold(n: number): number {
  return n > 0 ? Math.min(1, 2 / Math.sqrt(n)) : 1
}

export interface CorrelationReading {
  /** The strength and direction in words, e.g. "Strong positive relationship". */
  headline: string
  /** A warning when the sample is too small to trust the headline, otherwise null. */
  caveat: string | null
}

/**
 * A plain-language reading of a correlation coefficient.
 *
 * Strength and confidence are reported separately. The headline always
 * describes the size of r; the caveat says when that size could easily have
 * come from chance given how few experiments it is based on.
 */
export function readCorrelation(r: number | null, n: number): CorrelationReading {
  if (r === null) return { headline: 'Not enough data to tell', caveat: null }
  const size = Math.abs(r)
  if (size < 0.2) return { headline: 'No clear relationship', caveat: null }
  const strength = size >= 0.7 ? 'Strong' : size >= 0.4 ? 'Moderate' : 'Weak'
  return {
    headline: `${strength} ${r > 0 ? 'positive' : 'negative'} relationship`,
    caveat: size < noiseThreshold(n) ? `With only ${n} experiments, this could be chance` : null,
  }
}

/** A filter range in words: "≥ 12.0 MPa", "≤ 3.50 min" or "2,400.0 – 2,800.0 cP". */
export function describeRange(variable: Variable, [low, high]: Range): string {
  const [min, max] = variable.extent
  if (low <= min) return `≤ ${formatWithUnit(high, variable)}`
  if (high >= max) return `≥ ${formatWithUnit(low, variable)}`
  return `${formatValue(low, variable)} – ${formatWithUnit(high, variable)}`
}

export interface Subset {
  experiments: Experiment[]
  /** How the user narrowed the experiments down. */
  source: 'selection' | 'filters'
}

/**
 * The experiments the user has singled out: the selected ones if there are
 * any, otherwise whatever the filters leave. Null when nothing is narrowed.
 */
export function activeSubset(
  dataset: Dataset,
  state: ViewState,
  visible: Experiment[],
): Subset | null {
  const selected = new Set(state.selection)
  const selection = visible.filter((experiment) => selected.has(experiment.id))
  if (selection.length > 0) return { experiments: selection, source: 'selection' }
  if (visible.length > 0 && visible.length < dataset.experiments.length) {
    return { experiments: visible, source: 'filters' }
  }
  return null
}

export interface ProfileRow {
  variable: Variable
  subsetMean: number
  overallMean: number
  /** Subset mean minus overall mean, in overall standard deviations. */
  shift: number
}

/**
 * How a subset's recipe differs from the dataset as a whole: every input,
 * ordered by how far its average in the subset sits from its overall average.
 */
export function subsetProfile(dataset: Dataset, subset: Experiment[]): ProfileRow[] {
  const rows: ProfileRow[] = []
  for (const variable of dataset.inputs) {
    const overall = column(dataset.experiments, variable.key)
    const overallMean = mean(overall)
    const subsetMean = mean(column(subset, variable.key))
    const spread = standardDeviation(overall)
    // An input that never varies cannot set a subset apart.
    if (overallMean === null || subsetMean === null || !spread) continue
    rows.push({ variable, subsetMean, overallMean, shift: (subsetMean - overallMean) / spread })
  }
  return rows.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift))
}

/** The view shown on first load: the input/output pair with the strongest correlation. */
export function initialViewState(dataset: Dataset): ViewState {
  const matrix = correlationMatrix(dataset, dataset.experiments)
  let x = dataset.inputs[0]?.key ?? ''
  let y = dataset.outputs[0]?.key ?? ''
  let strongest = -1

  for (const input of dataset.inputs) {
    for (const output of dataset.outputs) {
      const size = Math.abs(matrix[input.key][output.key] ?? 0)
      if (size > strongest) {
        strongest = size
        x = input.key
        y = output.key
      }
    }
  }

  return {
    x,
    y,
    colorBy: null,
    filters: {},
    selection: [],
    sort: { key: 'date', direction: 'asc' },
  }
}
