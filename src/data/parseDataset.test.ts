import { describe, expect, it } from 'vitest'
import { correlation } from '@/lib/stats'
import { DatasetError, loadDataset, parseDataset } from './index'

const experiment = (inputs: object, outputs: object) => ({ inputs, outputs })

describe('parseDataset', () => {
  it('derives experiments and variables from the data', () => {
    const dataset = parseDataset({
      '20170104_EXP_56': experiment({ 'Polymer 1': 10, 'Polymer 2': 0 }, { Viscosity: 2500 }),
      '20170105_EXP_92': experiment({ 'Polymer 1': 30, 'Polymer 2': 5 }, { Viscosity: 2100 }),
    })

    expect(dataset.experiments).toHaveLength(2)
    expect(dataset.experiments[0]).toMatchObject({
      id: '20170104_EXP_56',
      name: 'EXP 56',
      date: '2017-01-04',
    })
    expect(dataset.inputs.map((v) => v.key)).toEqual(['Polymer 1', 'Polymer 2'])
    expect(dataset.variable('Polymer 1')).toMatchObject({
      kind: 'input',
      family: 'Polymer',
      extent: [10, 30],
    })
    expect(dataset.variable('Viscosity')?.kind).toBe('output')
  })

  it('keeps ids that have no date prefix', () => {
    const dataset = parseDataset({ 'batch-a': experiment({ A: 1 }, { B: 2 }) })
    expect(dataset.experiments[0]).toMatchObject({ id: 'batch-a', name: 'batch-a', date: null })
  })

  it('turns missing and non-numeric values into null', () => {
    const dataset = parseDataset({
      first: experiment({ A: 1, B: 'n/a' }, { C: null }),
      second: experiment({ A: 2 }, { C: 3 }),
    })
    expect(dataset.experiments[0].values).toEqual({ A: 1, B: null, C: null })
    // "second" never mentions B, so it is filled in as missing.
    expect(dataset.experiments[1].values).toEqual({ A: 2, B: null, C: 3 })
    expect(dataset.variable('B')?.extent).toEqual([0, 0])
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['an empty object', {}],
    ['an experiment without outputs', { a: { inputs: {} } }],
    ['a name used as both input and output', { a: experiment({ X: 1 }, { X: 2 }) }],
  ])('rejects %s', (_label, raw) => {
    expect(() => parseDataset(raw)).toThrow(DatasetError)
  })
})

describe('the bundled dataset', () => {
  const dataset = loadDataset()
  const column = (key: string) => dataset.experiments.map((e) => e.values[key])
  const r = (x: string, y: string) => correlation('pearson', column(x), column(y))

  it('has 25 experiments, 19 inputs and 5 outputs, with no missing values', () => {
    expect(dataset.experiments).toHaveLength(25)
    expect(dataset.inputs).toHaveLength(19)
    expect(dataset.outputs).toHaveLength(5)
    const allValues = dataset.experiments.flatMap((e) => Object.values(e.values))
    expect(allValues).not.toContain(null)
  })

  it('has unique experiment ids', () => {
    const ids = dataset.experiments.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('groups ingredients into families', () => {
    const families = new Set(dataset.inputs.map((v) => v.family))
    expect([...families]).toEqual([
      'Polymer',
      'Carbon Black',
      'Silica Filler',
      'Plasticizer',
      'Antioxidant',
      'Coloring Pigment',
      'Co-Agent',
      'Curing Agent',
      'Process',
    ])
  })

  // Reference values from an independent analysis of the raw file.
  it.each([
    ['Carbon Black High Grade', 'Viscosity', 0.88],
    ['Polymer 4', 'Elongation', -0.82],
    ['Plasticizer 2', 'Compression Set', -0.82],
    ['Silica Filler 2', 'Tensile Strength', 0.81],
  ])('correlates %s with %s at about %f', (input, output, expected) => {
    expect(r(input, output)).toBeCloseTo(expected, 2)
  })
})
