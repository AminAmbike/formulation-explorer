import type { Dataset, Experiment, Variable, VariableKind } from './types'
import { familyOf } from './variableMeta'

/** Thrown when the raw JSON does not have the expected shape. */
export class DatasetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatasetError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Missing and non-numeric measurements become null rather than failing the whole load. */
function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** "20170104_EXP_56" → { date: "2017-01-04", name: "EXP 56" }. */
function parseId(id: string): Pick<Experiment, 'date' | 'name'> {
  const match = /^(\d{4})(\d{2})(\d{2})_(.+)$/.exec(id)
  if (!match) return { date: null, name: id }
  const [, year, month, day, rest] = match
  return { date: `${year}-${month}-${day}`, name: rest.replaceAll('_', ' ') }
}

/**
 * Turns the raw JSON into the typed model the app uses.
 *
 * The variable lists are derived from the data rather than hard-coded, so a
 * different dataset with the same shape loads without code changes.
 *
 * @throws DatasetError if the overall structure is wrong.
 */
export function parseDataset(raw: unknown): Dataset {
  if (!isRecord(raw)) {
    throw new DatasetError('Expected an object keyed by experiment name.')
  }

  // Variable names in first-seen order, kept separately for inputs and outputs.
  const names: Record<VariableKind, string[]> = { input: [], output: [] }
  const seen = new Map<string, VariableKind>()
  const experiments: Experiment[] = []

  for (const [id, record] of Object.entries(raw)) {
    if (!isRecord(record) || !isRecord(record.inputs) || !isRecord(record.outputs)) {
      throw new DatasetError(`Experiment "${id}" must have "inputs" and "outputs" objects.`)
    }

    const values: Experiment['values'] = {}
    const sections = [
      ['input', record.inputs],
      ['output', record.outputs],
    ] as const

    for (const [kind, section] of sections) {
      for (const [name, value] of Object.entries(section)) {
        const knownKind = seen.get(name)
        if (knownKind === undefined) {
          seen.set(name, kind)
          names[kind].push(name)
        } else if (knownKind !== kind) {
          throw new DatasetError(`"${name}" appears as both an input and an output.`)
        }
        values[name] = toNumberOrNull(value)
      }
    }

    experiments.push({ id, ...parseId(id), values })
  }

  if (experiments.length === 0) {
    throw new DatasetError('The dataset contains no experiments.')
  }

  const describe = (key: string, kind: VariableKind): Variable => {
    let min = Infinity
    let max = -Infinity
    for (const experiment of experiments) {
      // An experiment that never mentions this variable counts as missing.
      const value = (experiment.values[key] ??= null)
      if (value === null) continue
      if (value < min) min = value
      if (value > max) max = value
    }
    const extent: Variable['extent'] = min <= max ? [min, max] : [0, 0]
    return { key, kind, family: familyOf(key, kind), extent }
  }

  const inputs = names.input.map((key) => describe(key, 'input'))
  const outputs = names.output.map((key) => describe(key, 'output'))
  const byKey = new Map([...inputs, ...outputs].map((variable) => [variable.key, variable]))

  return { experiments, inputs, outputs, variable: (key) => byKey.get(key) }
}
