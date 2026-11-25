import type { VariableKind } from './types'

/** Family shown for every measured output. */
export const OUTPUT_FAMILY = 'Measurement'

/**
 * Families that cannot be derived from the name alone.
 * Everything else falls back to the name with its trailing number removed.
 */
const FAMILY_OVERRIDES: Record<string, string> = {
  'Carbon Black High Grade': 'Carbon Black',
  'Carbon Black Low Grade': 'Carbon Black',
  'Oven Temperature': 'Process',
}

/** "Polymer 3" → "Polymer", "Antioxidant" → "Antioxidant". */
export function familyOf(name: string, kind: VariableKind): string {
  if (kind === 'output') return OUTPUT_FAMILY
  return FAMILY_OVERRIDES[name] ?? name.replace(/\s+\d+$/, '')
}

/** Splits a list into runs of the same family, keeping the original order. */
export function groupByFamily<T extends { family: string }>(
  variables: T[],
): { family: string; variables: T[] }[] {
  const groups: { family: string; variables: T[] }[] = []
  for (const variable of variables) {
    const last = groups.at(-1)
    if (last && last.family === variable.family) last.variables.push(variable)
    else groups.push({ family: variable.family, variables: [variable] })
  }
  return groups
}

/**
 * A variable's name without its family, for use under a family heading:
 * "Polymer 3" → "3", "Carbon Black High Grade" → "High Grade".
 */
export function shortLabel(variable: { key: string; family: string }): string {
  if (!variable.key.startsWith(variable.family)) return variable.key
  return variable.key.slice(variable.family.length).trim() || variable.key
}
