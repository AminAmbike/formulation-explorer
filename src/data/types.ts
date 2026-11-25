/** Whether a variable is something the chemist chose (input) or measured (output). */
export type VariableKind = 'input' | 'output'

/** One column of the dataset, e.g. "Polymer 1" or "Viscosity". */
export interface Variable {
  /** The exact name used in the dataset. Unique across inputs and outputs. */
  key: string
  kind: VariableKind
  /** Group of related variables, e.g. "Polymer" for Polymer 1–4. */
  family: string
  /** Smallest and largest value across all experiments. */
  extent: [min: number, max: number]
  /** Most decimal places any recorded value has (at most 3), used when displaying values. */
  decimals: number
}

/** One row of the dataset. */
export interface Experiment {
  /** The full dataset key, e.g. "20170104_EXP_56". The EXP number alone is not unique. */
  id: string
  /** The part of the id after the date, e.g. "EXP 56". */
  name: string
  /** ISO date (YYYY-MM-DD) parsed from the id, or null if the id has no date prefix. */
  date: string | null
  /** Value per variable key. null means the value is missing or not a number. */
  values: Record<string, number | null>
}

export interface Dataset {
  experiments: Experiment[]
  inputs: Variable[]
  outputs: Variable[]
  /** Look up any variable by its key. */
  variable: (key: string) => Variable | undefined
}
