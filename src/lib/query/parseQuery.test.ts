import { describe, expect, it } from 'vitest'
import { loadDataset } from '@/data'
import type { Action } from '@/state/viewState'
import { matchVariable, words } from './matchVariable'
import { EXAMPLE_QUERIES, parseQuery } from './parseQuery'

const dataset = loadDataset()
const variables = [...dataset.outputs, ...dataset.inputs]
const extent = (key: string) => dataset.variable(key)!.extent

/** The actions a query produces, or the failure message if it does not parse. */
function run(query: string): Action[] | string {
  const result = parseQuery(query, dataset)
  return result.ok ? result.actions : result.message
}

describe('words', () => {
  it('lower-cases, drops punctuation and splits letters from digits', () => {
    expect(words('Co-Agent 3')).toEqual(['co', 'agent', '3'])
    expect(words('polymer4')).toEqual(['polymer', '4'])
  })
})

describe('matchVariable', () => {
  it.each([
    ['viscosity', 'Viscosity'],
    ['TENSILE', 'Tensile Strength'],
    ['temp', 'Oven Temperature'],
    ['carbon high', 'Carbon Black High Grade'],
    ['high carbon', 'Carbon Black High Grade'],
    ['poly 4', 'Polymer 4'],
    ['polymer4', 'Polymer 4'],
    ['co agent 2', 'Co-Agent 2'],
  ])('reads "%s" as %s', (phrase, expected) => {
    expect(matchVariable(phrase, variables)).toMatchObject({
      kind: 'match',
      variable: { key: expected },
    })
  })

  it('reports every candidate when a phrase fits more than one variable', () => {
    const match = matchVariable('polymer', variables)
    expect(match.kind).toBe('ambiguous')
    expect(match.kind === 'ambiguous' && match.candidates.map((v) => v.key)).toEqual([
      'Polymer 1',
      'Polymer 2',
      'Polymer 3',
      'Polymer 4',
    ])
  })

  it('finds nothing for an unknown or empty phrase', () => {
    expect(matchVariable('hardness', variables).kind).toBe('none')
    expect(matchVariable('  ', variables).kind).toBe('none')
  })
})

describe('parseQuery', () => {
  it.each<[string, Action[]]>([
    [
      'plot viscosity vs carbon high',
      [{ type: 'setAxes', x: 'Carbon Black High Grade', y: 'Viscosity' }],
    ],
    ['Elongation against Polymer 4', [{ type: 'setAxes', x: 'Polymer 4', y: 'Elongation' }]],
    ['plot cure time', [{ type: 'setY', key: 'Cure Time' }]],
    ['show silica filler 2', [{ type: 'setX', key: 'Silica Filler 2' }]],
    ['colour by oven temperature', [{ type: 'setColorBy', key: 'Oven Temperature' }]],
    ['color by temp', [{ type: 'setColorBy', key: 'Oven Temperature' }]],
    ['colour by nothing', [{ type: 'setColorBy', key: null }]],
    ['sort by viscosity', [{ type: 'setSort', sort: { key: 'Viscosity', direction: 'desc' } }]],
    ['sort by cure time asc', [{ type: 'setSort', sort: { key: 'Cure Time', direction: 'asc' } }]],
    ['sort by date', [{ type: 'setSort', sort: { key: 'date', direction: 'desc' } }]],
    ['clear filters', [{ type: 'clearFilters' }]],
    ['clear selection', [{ type: 'setSelection', ids: [] }]],
    ['reset', [{ type: 'clearFilters' }, { type: 'setSelection', ids: [] }]],
  ])('reads "%s"', (query, expected) => {
    expect(run(query)).toEqual(expected)
  })

  it.each<[string, string, [number, number]]>([
    ['tensile strength >= 12', 'Tensile Strength', [12, extent('Tensile Strength')[1]]],
    // Strict comparisons move by one unit of the variable's precision.
    ['tensile strength > 12', 'Tensile Strength', [12.1, extent('Tensile Strength')[1]]],
    ['cure time < 3', 'Cure Time', [extent('Cure Time')[0], 2.99]],
    ['compression set at most 55', 'Compression Set', [extent('Compression Set')[0], 55]],
    ['viscosity above 2,500', 'Viscosity', [2500.1, extent('Viscosity')[1]]],
    ['oven temperature = 425', 'Oven Temperature', [425, 425]],
    ['viscosity between 2400 and 2800', 'Viscosity', [2400, 2800]],
    ['viscosity 2800-2400', 'Viscosity', [2400, 2800]],
    ['silica filler 2 > 10', 'Silica Filler 2', [10.1, extent('Silica Filler 2')[1]]],
    ['with plasticizer 2', 'Plasticizer 2', [0.1, extent('Plasticizer 2')[1]]],
    ['without carbon black low', 'Carbon Black Low Grade', [0, 0]],
  ])('reads the filter "%s"', (query, key, range) => {
    expect(run(query)).toEqual([{ type: 'setFilter', key, range }])
  })

  it('combines clauses joined by "and" or commas, in order', () => {
    expect(run('plot elongation vs polymer 4, with plasticizer 2 and sort by viscosity')).toEqual([
      { type: 'setAxes', x: 'Polymer 4', y: 'Elongation' },
      { type: 'setFilter', key: 'Plasticizer 2', range: [0.1, extent('Plasticizer 2')[1]] },
      { type: 'setSort', sort: { key: 'Viscosity', direction: 'desc' } },
    ])
  })

  it('says back what it understood', () => {
    const result = parseQuery('viscosity > 2500 and colour by temp', dataset)
    expect(result.ok && result.summary).toBe('Keep Viscosity ≥ 2,500.1 · Colour by Oven Temperature')
  })

  it('offers each candidate when a name is ambiguous', () => {
    const result = parseQuery('Polymer > 10', dataset)
    expect(result).toEqual({
      ok: false,
      message: '"polymer" could be several things.',
      suggestions: ['polymer 1 > 10', 'polymer 2 > 10', 'polymer 3 > 10', 'polymer 4 > 10'],
    })
    // Every suggestion is itself a valid query.
    expect(!result.ok && result.suggestions.every((s) => parseQuery(s, dataset).ok)).toBe(true)
  })

  it.each([
    ['hardness > 3', `I don't know a variable called "hardness".`],
    ['make it pretty', `I couldn't read "make it pretty".`],
    ['viscosity > 9000', 'No experiment has Viscosity in that range. It runs from 2,160.8 to 3,561.2.'],
  ])('explains why "%s" fails', (query, message) => {
    expect(run(query)).toBe(message)
  })

  it('rejects the whole query if any clause fails, so nothing is half applied', () => {
    expect(parseQuery('sort by viscosity and hardness > 3', dataset).ok).toBe(false)
  })

  it('offers no suggestions when it has nothing sensible to offer', () => {
    expect(parseQuery('   ', dataset)).toMatchObject({ ok: false, suggestions: [] })
    expect(parseQuery('make it pretty', dataset)).toMatchObject({ ok: false, suggestions: [] })
  })

  it('ships examples that all parse', () => {
    for (const example of EXAMPLE_QUERIES) {
      expect(parseQuery(example, dataset).ok, example).toBe(true)
    }
  })
})
