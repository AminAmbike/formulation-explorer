import type { Dataset, Variable } from '@/data'
import { formatValue, formatWithUnit } from '@/lib/format'
import { describeRange } from '@/state/selectors'
import type { Action, Range } from '@/state/viewState'
import { matchVariable } from './matchVariable'

/**
 * Turns a typed request such as "plot viscosity vs carbon high" into the
 * same Actions the page's controls dispatch. There is no AI here: the
 * vocabulary is small and closed, so a handful of patterns covers it and the
 * result is predictable and testable.
 */
export type ParseResult =
  | { ok: true; actions: Action[]; summary: string }
  /**
   * `suggestions` are complete queries to pick from when a name was
   * ambiguous. It is empty when there is nothing sensible to offer.
   */
  | { ok: false; message: string; suggestions: string[] }

export const EXAMPLE_QUERIES = [
  'plot tensile strength vs silica filler 2',
  'compression set < 55',
  'with plasticizer 2',
  'colour by oven temperature',
  'sort by viscosity',
  'clear filters',
]

/** One recognised clause: what to do, and how to say it back to the user. */
interface Step {
  actions: Action[]
  summary: string
}

/** Thrown inside the parser and turned into a failed ParseResult at the top. */
class QueryError extends Error {
  alternatives: Variable[]
  phrase: string

  constructor(message: string, phrase = '', alternatives: Variable[] = []) {
    super(message)
    this.phrase = phrase
    this.alternatives = alternatives
  }
}

const NUMBER = String.raw`(-?\d+(?:\.\d+)?)`

const COMPARISONS: Record<string, '>' | '>=' | '<' | '<=' | '='> = {
  '>': '>',
  above: '>',
  over: '>',
  'more than': '>',
  'greater than': '>',
  '>=': '>=',
  '≥': '>=',
  'at least': '>=',
  '<': '<',
  below: '<',
  under: '<',
  'less than': '<',
  '<=': '<=',
  '≤': '<=',
  'at most': '<=',
  '=': '=',
  is: '=',
  equals: '=',
}
// Longest first, so "<=" is tried before "<".
const COMPARISON_PATTERN = Object.keys(COMPARISONS)
  .sort((a, b) => b.length - a.length)
  .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|')

export function parseQuery(text: string, dataset: Dataset): ParseResult {
  const variables = [...dataset.outputs, ...dataset.inputs]

  const find = (phrase: string): Variable => {
    const match = matchVariable(phrase, variables)
    if (match.kind === 'match') return match.variable
    if (match.kind === 'ambiguous') {
      throw new QueryError(`"${phrase.trim()}" could be several things.`, phrase, match.candidates)
    }
    throw new QueryError(`I don't know a variable called "${phrase.trim()}".`)
  }

  const clauses = text
    .toLowerCase()
    // "2,500" is one number, not two clauses.
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    // Protect the "and" inside "between 10 and 20" from the clause split below.
    .replace(new RegExp(String.raw`(between|from)\s+${NUMBER}\s+and\s+${NUMBER}`, 'g'), '$1 $2 to $3')
    .split(/\s*(?:,|;|\band\b|\bthen\b)\s*/)
    .map((clause) => clause.trim())
    .filter(Boolean)

  if (clauses.length === 0) {
    return { ok: false, message: 'Type a request.', suggestions: [] }
  }

  try {
    const steps = clauses.map((clause) => parseClause(clause, find))
    return {
      ok: true,
      actions: steps.flatMap((step) => step.actions),
      summary: steps.map((step) => step.summary).join(' · '),
    }
  } catch (error) {
    if (!(error instanceof QueryError)) throw error
    // For an ambiguous name, offer the same query with each candidate filled in.
    const suggestions = error.alternatives.map((variable) =>
      text.toLowerCase().replace(error.phrase.trim(), variable.key.toLowerCase()),
    )
    return { ok: false, message: error.message, suggestions }
  }
}

function parseClause(clause: string, find: (phrase: string) => Variable): Step {
  let match: RegExpExecArray | null

  // clear / reset [filters | selection]
  if ((match = /^(?:clear|reset|remove)(?:\s+(?:the|all))?\s*(filters?|selection|everything)?$/.exec(clause))) {
    const target = match[1] ?? 'everything'
    if (target.startsWith('filter')) {
      return { actions: [{ type: 'clearFilters' }], summary: 'Clear filters' }
    }
    if (target === 'selection') {
      return { actions: [{ type: 'setSelection', ids: [] }], summary: 'Clear selection' }
    }
    return {
      actions: [{ type: 'clearFilters' }, { type: 'setSelection', ids: [] }],
      summary: 'Clear filters and selection',
    }
  }

  // colour by <variable> | nothing
  if ((match = /^colou?r(?:ed)?\s+by\s+(.+)$/.exec(clause))) {
    if (/^(nothing|none|off)$/.test(match[1])) {
      return { actions: [{ type: 'setColorBy', key: null }], summary: 'Remove point colours' }
    }
    const variable = find(match[1])
    return {
      actions: [{ type: 'setColorBy', key: variable.key }],
      summary: `Colour by ${variable.key}`,
    }
  }

  // sort by <variable> [asc | desc]
  if ((match = /^sort(?:ed)?\s+by\s+(.+?)(?:\s+(asc|ascending|lowest|low|desc|descending|highest|high))?$/.exec(clause))) {
    const ascending = match[2] !== undefined && /^(asc|low)/.test(match[2])
    const direction = ascending ? 'asc' : 'desc'
    const order = ascending ? 'lowest first' : 'highest first'
    if (match[1] === 'date') {
      return {
        actions: [{ type: 'setSort', sort: { key: 'date', direction } }],
        summary: `Sort by date, ${ascending ? 'oldest' : 'newest'} first`,
      }
    }
    const variable = find(match[1])
    return {
      actions: [{ type: 'setSort', sort: { key: variable.key, direction } }],
      summary: `Sort by ${variable.key}, ${order}`,
    }
  }

  // [plot] <y> vs <x>
  if ((match = /^(?:(?:plot|show|graph|chart|scatter|compare)\s+)?(.+?)\s+(?:vs\.?|versus|against)\s+(.+)$/.exec(clause))) {
    const y = find(match[1])
    const x = find(match[2])
    return {
      actions: [{ type: 'setAxes', x: x.key, y: y.key }],
      summary: `Plot ${y.key} against ${x.key}`,
    }
  }

  // with / without <ingredient>
  if ((match = /^(with|using|has|containing|without|no)\s+(.+)$/.exec(clause))) {
    const variable = find(match[2])
    const wanted = !/^(without|no)$/.test(match[1])
    const range: Range = wanted ? [precisionUnit(variable), variable.extent[1]] : [0, 0]
    return {
      actions: [{ type: 'setFilter', key: variable.key, range }],
      summary: `Keep experiments ${wanted ? 'with' : 'without'} ${variable.key}`,
    }
  }

  // <variable> between <a> and <b>   |   <variable> <a> - <b>
  if ((match = new RegExp(String.raw`^(.+?)\s+(?:(?:between|from)\s+)?${NUMBER}\s*(?:to|-|–)\s*${NUMBER}$`).exec(clause))) {
    const variable = find(match[1])
    const bounds = [Number(match[2]), Number(match[3])].sort((a, b) => a - b)
    return filterStep(variable, [bounds[0], bounds[1]])
  }

  // <variable> > <number>
  if ((match = new RegExp(String.raw`^(.+?)\s*(${COMPARISON_PATTERN})\s*${NUMBER}$`).exec(clause))) {
    const variable = find(match[1])
    const value = Number(match[3])
    const unit = precisionUnit(variable)
    const [min, max] = variable.extent
    // Values are recorded to a fixed precision, so "> 12" is the same as ">= 12.1".
    const ranges: Record<string, Range> = {
      '>': [roundTo(value + unit, variable), max],
      '>=': [value, max],
      '<': [min, roundTo(value - unit, variable)],
      '<=': [min, value],
      '=': [value, value],
    }
    return filterStep(variable, ranges[COMPARISONS[match[2]]])
  }

  // plot <variable>: an output goes on the vertical axis, an input on the horizontal one.
  if ((match = /^(?:plot|show|graph|chart)\s+(.+)$/.exec(clause))) {
    const variable = find(match[1])
    return variable.kind === 'output'
      ? { actions: [{ type: 'setY', key: variable.key }], summary: `Plot ${variable.key} on the vertical axis` }
      : { actions: [{ type: 'setX', key: variable.key }], summary: `Plot ${variable.key} on the horizontal axis` }
  }

  throw new QueryError(`I couldn't read "${clause}".`)
}

function filterStep(variable: Variable, range: Range): Step {
  const [min, max] = variable.extent
  if (range[0] > max || range[1] < min) {
    throw new QueryError(
      `No experiment has ${variable.key} in that range. It runs from ${formatValue(min, variable)} to ${formatWithUnit(max, variable)}.`,
    )
  }
  return {
    actions: [{ type: 'setFilter', key: variable.key, range }],
    summary: `Keep ${variable.key} ${describeRange(variable, range)}`,
  }
}

/** The smallest step the variable was recorded in: 0.1 for one decimal place. */
function precisionUnit(variable: Variable): number {
  return 10 ** -variable.decimals
}

/** Removes floating-point noise such as 12 + 0.1 = 12.100000000000001. */
function roundTo(value: number, variable: Variable): number {
  return Number(value.toFixed(variable.decimals))
}
