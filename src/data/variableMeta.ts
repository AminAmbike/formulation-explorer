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
