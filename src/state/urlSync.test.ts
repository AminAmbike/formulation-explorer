import { describe, expect, it } from 'vitest'
import { loadDataset } from '@/data'
import { initialViewState } from './selectors'
import { decodeViewState, encodeViewState } from './urlSync'
import type { ViewState } from './viewState'

const dataset = loadDataset()
const defaults = initialViewState(dataset)
const decode = (search: string) => decodeViewState(search, dataset, defaults)

describe('urlSync', () => {
  it('writes nothing for the default view', () => {
    expect(encodeViewState(defaults, defaults)).toBe('')
    expect(decode('')).toEqual(defaults)
  })

  it('round-trips a fully customised view', () => {
    const state: ViewState = {
      x: 'Polymer 4',
      y: 'Elongation',
      colorBy: 'Oven Temperature',
      sort: { key: 'Viscosity', direction: 'desc' },
      filters: { 'Compression Set': [42.7, 59.9], 'Plasticizer 2': [0.1, 23.1] },
      selection: ['20170111_EXP_12', '20170116_EXP_41'],
    }
    expect(decode(encodeViewState(state, defaults))).toEqual(state)
  })

  it('falls back to defaults for anything it does not recognise', () => {
    const state = decode(
      'x=Unknown&y=Elongation&color=Nope&sort=Viscosity~sideways' +
        '&filter=Unknown~1~2&filter=Viscosity~abc~3000&filter=Viscosity~~3000' +
        '&filter=Cure+Time~4~3&filter=Elongation~70~90&selected=not-an-experiment',
    )
    expect(state).toEqual({
      ...defaults,
      y: 'Elongation',
      // Only the one well-formed filter on a known variable survives.
      filters: { Elongation: [70, 90] },
    })
  })
})
