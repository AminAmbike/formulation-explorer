/** An inclusive numeric range, used for filters. */
export type Range = [min: number, max: number]

export interface SortOrder {
  /** A variable key, or "date" for the order the experiments were run in. */
  key: string
  direction: 'asc' | 'desc'
}

/**
 * Everything the user can change, in one plain object.
 *
 * Every control on the page (and the command bar) reads from this and writes
 * to it through an Action. Because it is plain data it can also be saved to
 * the URL and restored.
 */
export interface ViewState {
  /** Variable on the scatterplot's horizontal axis. */
  x: string
  /** Variable on the scatterplot's vertical axis. */
  y: string
  /** Variable that colours the scatterplot points, or null for a single colour. */
  colorBy: string | null
  /** Range filters by variable key. An experiment must pass all of them to be shown. */
  filters: Record<string, Range>
  /** Ids of the experiments the user has picked out. */
  selection: string[]
  sort: SortOrder
}

export type Action =
  | { type: 'setAxes'; x: string; y: string }
  | { type: 'setX'; key: string }
  | { type: 'setY'; key: string }
  | { type: 'swapAxes' }
  | { type: 'setColorBy'; key: string | null }
  /** A null range removes the filter for that variable. */
  | { type: 'setFilter'; key: string; range: Range | null }
  | { type: 'clearFilters' }
  | { type: 'setSelection'; ids: string[] }
  | { type: 'toggleSelected'; id: string }
  | { type: 'setSort'; sort: SortOrder }
  /** Sort by this column, or flip the direction if it is already the sort column. */
  | { type: 'toggleSort'; key: string }
  /** Swap in a whole state: used by Reset and when restoring from the URL. */
  | { type: 'replace'; state: ViewState }

export function viewStateReducer(state: ViewState, action: Action): ViewState {
  switch (action.type) {
    case 'setAxes':
      return { ...state, x: action.x, y: action.y }

    case 'setX':
      return { ...state, x: action.key }

    case 'setY':
      return { ...state, y: action.key }

    case 'swapAxes':
      return { ...state, x: state.y, y: state.x }

    case 'setColorBy':
      return { ...state, colorBy: action.key }

    case 'setFilter': {
      const filters = { ...state.filters }
      if (action.range === null) delete filters[action.key]
      else filters[action.key] = action.range
      return { ...state, filters }
    }

    case 'clearFilters':
      return { ...state, filters: {} }

    case 'setSelection':
      return { ...state, selection: action.ids }

    case 'toggleSelected': {
      const isSelected = state.selection.includes(action.id)
      const selection = isSelected
        ? state.selection.filter((id) => id !== action.id)
        : [...state.selection, action.id]
      return { ...state, selection }
    }

    case 'setSort':
      return { ...state, sort: action.sort }

    case 'toggleSort': {
      const isSameColumn = state.sort.key === action.key
      const flipped = state.sort.direction === 'asc' ? 'desc' : 'asc'
      // A new column starts with the largest values on top, which is usually what you want to see.
      return { ...state, sort: { key: action.key, direction: isSameColumn ? flipped : 'desc' } }
    }

    case 'replace':
      return action.state
  }
}
