import type { Variable } from '@/data'

export type VariableMatch =
  | { kind: 'match'; variable: Variable }
  /** More than one variable fits, e.g. "polymer" fits Polymer 1 to 4. */
  | { kind: 'ambiguous'; candidates: Variable[] }
  | { kind: 'none' }

/** "Carbon-Black  high" → ["carbon", "black", "high"]; "polymer4" → ["polymer", "4"]. */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/([a-z])(\d)/g, '$1 $2')
    .split(/[^a-z0-9.]+/)
    .filter(Boolean)
}

/**
 * Finds the variable a loosely typed phrase refers to.
 *
 * A phrase fits a variable when every word in it is the start of a word in
 * the variable's name, in any order: "carbon high" fits "Carbon Black High
 * Grade" and "temp" fits "Oven Temperature". An exact name always wins.
 */
export function matchVariable(phrase: string, variables: Variable[]): VariableMatch {
  const queryWords = words(phrase)
  if (queryWords.length === 0) return { kind: 'none' }

  const exact = variables.find(
    (variable) => words(variable.key).join(' ') === queryWords.join(' '),
  )
  if (exact) return { kind: 'match', variable: exact }

  const candidates = variables.filter((variable) => {
    const nameWords = words(variable.key)
    return queryWords.every((queryWord) =>
      nameWords.some((nameWord) => nameWord.startsWith(queryWord)),
    )
  })

  if (candidates.length === 1) return { kind: 'match', variable: candidates[0] }
  if (candidates.length > 1) return { kind: 'ambiguous', candidates }
  return { kind: 'none' }
}
