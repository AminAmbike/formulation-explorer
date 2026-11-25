import { describe, expect, it } from 'vitest'
import { viewStateReducer, type ViewState } from './viewState'

const base: ViewState = {
  x: 'Polymer 1',
  y: 'Viscosity',
  colorBy: null,
  filters: {},
  selection: [],
  sort: { key: 'date', direction: 'asc' },
  method: 'pearson',
}

describe('viewStateReducer', () => {
  it('never mutates the previous state', () => {
    const frozen = Object.freeze({ ...base, filters: Object.freeze({}), selection: Object.freeze([]) })
    const next = viewStateReducer(frozen as unknown as ViewState, {
      type: 'setFilter',
      key: 'Viscosity',
      range: [2000, 2500],
    })
    expect(next).not.toBe(frozen)
    expect(frozen.filters).toEqual({})
  })

  it('sets and swaps the axes', () => {
    const set = viewStateReducer(base, { type: 'setAxes', x: 'Polymer 4', y: 'Elongation' })
    expect(set).toMatchObject({ x: 'Polymer 4', y: 'Elongation' })
    expect(viewStateReducer(set, { type: 'swapAxes' })).toMatchObject({
      x: 'Elongation',
      y: 'Polymer 4',
    })
  })

  it('adds, replaces and removes a filter', () => {
    const added = viewStateReducer(base, { type: 'setFilter', key: 'Viscosity', range: [1, 2] })
    const replaced = viewStateReducer(added, { type: 'setFilter', key: 'Viscosity', range: [3, 4] })
    const removed = viewStateReducer(replaced, { type: 'setFilter', key: 'Viscosity', range: null })
    expect(added.filters).toEqual({ Viscosity: [1, 2] })
    expect(replaced.filters).toEqual({ Viscosity: [3, 4] })
    expect(removed.filters).toEqual({})
  })

  it('clears every filter at once', () => {
    const filtered = { ...base, filters: { A: [0, 1], B: [2, 3] } } satisfies ViewState
    expect(viewStateReducer(filtered, { type: 'clearFilters' }).filters).toEqual({})
  })

  it('toggles an experiment in and out of the selection', () => {
    const selected = viewStateReducer(base, { type: 'toggleSelected', id: 'a' })
    expect(selected.selection).toEqual(['a'])
    expect(viewStateReducer(selected, { type: 'toggleSelected', id: 'a' }).selection).toEqual([])
  })

  it('sorts a new column descending, then flips on the second click', () => {
    const first = viewStateReducer(base, { type: 'toggleSort', key: 'Viscosity' })
    const second = viewStateReducer(first, { type: 'toggleSort', key: 'Viscosity' })
    expect(first.sort).toEqual({ key: 'Viscosity', direction: 'desc' })
    expect(second.sort).toEqual({ key: 'Viscosity', direction: 'asc' })
  })

  it('replaces the whole state', () => {
    const other = { ...base, x: 'Polymer 2' }
    expect(viewStateReducer(base, { type: 'replace', state: other })).toBe(other)
  })
})
