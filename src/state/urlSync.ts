/**
 * Saves the view state in the URL's query string and reads it back, so a
 * view survives a reload and can be shared as a link.
 *
 * Only values that differ from the defaults are written, which keeps the
 * URL empty for the default view.
 */
import type { Dataset } from '@/data'
import type { Range, ViewState } from './viewState'

/** Separates the parts of one filter or sort value. Chosen because names are unlikely to contain it. */
const SEPARATOR = '~'

export function encodeViewState(state: ViewState, defaults: ViewState): string {
  const params = new URLSearchParams()
  if (state.x !== defaults.x) params.set('x', state.x)
  if (state.y !== defaults.y) params.set('y', state.y)
  if (state.colorBy !== null) params.set('color', state.colorBy)
  if (state.sort.key !== defaults.sort.key || state.sort.direction !== defaults.sort.direction) {
    params.set('sort', [state.sort.key, state.sort.direction].join(SEPARATOR))
  }
  for (const [key, [min, max]] of Object.entries(state.filters)) {
    params.append('filter', [key, min, max].join(SEPARATOR))
  }
  for (const id of state.selection) params.append('selected', id)
  return params.toString()
}

/**
 * Rebuilds a view state from a query string. Anything it does not recognise
 * (a renamed variable, a mangled number) is dropped in favour of the default,
 * so an old or hand-edited link can never put the page in a broken state.
 */
export function decodeViewState(search: string, dataset: Dataset, defaults: ViewState): ViewState {
  const params = new URLSearchParams(search)
  const variableOr = <T>(key: string | null, fallback: T) =>
    key !== null && dataset.variable(key) ? key : fallback

  const [sortKey, sortDirection] = (params.get('sort') ?? '').split(SEPARATOR)
  const sortIsValid =
    (sortKey === 'date' || dataset.variable(sortKey) !== undefined) &&
    (sortDirection === 'asc' || sortDirection === 'desc')

  const filters: Record<string, Range> = {}
  for (const entry of params.getAll('filter')) {
    const [key, min, max] = entry.split(SEPARATOR)
    const range: Range = [Number(min), Number(max)]
    // Number('') is 0, so an empty part must be rejected explicitly.
    const isValid = min !== '' && max !== '' && max !== undefined && range.every(Number.isFinite)
    if (dataset.variable(key) && isValid && range[0] <= range[1]) filters[key] = range
  }

  const knownIds = new Set(dataset.experiments.map((experiment) => experiment.id))

  return {
    x: variableOr(params.get('x'), defaults.x),
    y: variableOr(params.get('y'), defaults.y),
    colorBy: variableOr(params.get('color'), null),
    sort: sortIsValid ? { key: sortKey, direction: sortDirection } : defaults.sort,
    filters,
    selection: params.getAll('selected').filter((id) => knownIds.has(id)),
  }
}
