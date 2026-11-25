import raw from './dataset.json'
import { parseDataset } from './parseDataset'

export type { Dataset, Experiment, Variable, VariableKind } from './types'
export { DatasetError, parseDataset } from './parseDataset'
export { groupByFamily, PROCESS_FAMILY, shortLabel } from './variableMeta'

/** Parses the bundled dataset. Throws DatasetError if the file is malformed. */
export function loadDataset() {
  return parseDataset(raw)
}
