/**
 * Pure functions that derive what the views show from the dataset and the
 * view state. Components call these inside useMemo.
 */
import type { Dataset, Experiment } from '@/data'
import { correlation, type CorrelationMethod } from '@/lib/stats'
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
  method: CorrelationMethod,
): CorrelationMatrix {
  const outputColumns = dataset.outputs.map(
    (output) => [output.key, column(experiments, output.key)] as const,
  )
  const matrix: CorrelationMatrix = {}
  for (const input of dataset.inputs) {
    const inputColumn = column(experiments, input.key)
    const row: Record<string, number | null> = {}
    for (const [outputKey, outputColumn] of outputColumns) {
      row[outputKey] = correlation(method, inputColumn, outputColumn)
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

/** A plain-language reading of a correlation, e.g. "strong positive". */
export function describeCorrelation(r: number | null, threshold: number): string {
  if (r === null) return 'not enough data'
  const size = Math.abs(r)
  if (size < threshold) return 'no clear relationship'
  const strength = size >= 0.7 ? 'strong' : 'moderate'
  return `${strength} ${r > 0 ? 'positive' : 'negative'}`
}

/** The view shown on first load: the input/output pair with the strongest correlation. */
export function initialViewState(dataset: Dataset): ViewState {
  const matrix = correlationMatrix(dataset, dataset.experiments, 'pearson')
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
    method: 'pearson',
  }
}
