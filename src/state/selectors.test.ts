import { describe, expect, it } from 'vitest'
import { loadDataset, parseDataset } from '@/data'
import {
  activeSubset,
  applyFilters,
  correlationMatrix,
  describeCorrelation,
  describeRange,
  initialViewState,
  noiseThreshold,
  sortExperiments,
  subsetProfile,
} from './selectors'

const small = parseDataset({
  '20170103_EXP_3': { inputs: { A: 3 }, outputs: { Y: 30 } },
  '20170101_EXP_1': { inputs: { A: 1 }, outputs: { Y: null } },
  '20170102_EXP_2': { inputs: { A: 2 }, outputs: { Y: 10 } },
})
const ids = (experiments: { id: string }[]) => experiments.map((e) => e.id.slice(-1))

describe('applyFilters', () => {
  it('returns the same array when there are no filters', () => {
    expect(applyFilters(small.experiments, {})).toBe(small.experiments)
  })

  it('keeps experiments inside every range, inclusive at both ends', () => {
    expect(ids(applyFilters(small.experiments, { A: [2, 3] }))).toEqual(['3', '2'])
    expect(ids(applyFilters(small.experiments, { A: [2, 3], Y: [0, 10] }))).toEqual(['2'])
  })

  it('drops experiments whose filtered value is missing', () => {
    expect(ids(applyFilters(small.experiments, { Y: [0, 100] }))).toEqual(['3', '2'])
  })
})

describe('sortExperiments', () => {
  it('sorts by date using the id', () => {
    const sorted = sortExperiments(small.experiments, { key: 'date', direction: 'asc' })
    expect(ids(sorted)).toEqual(['1', '2', '3'])
  })

  it('sorts by a variable and keeps missing values last in both directions', () => {
    expect(ids(sortExperiments(small.experiments, { key: 'Y', direction: 'asc' }))).toEqual(['2', '3', '1'])
    expect(ids(sortExperiments(small.experiments, { key: 'Y', direction: 'desc' }))).toEqual(['3', '2', '1'])
  })

  it('does not reorder the original array', () => {
    sortExperiments(small.experiments, { key: 'A', direction: 'asc' })
    expect(ids(small.experiments)).toEqual(['3', '1', '2'])
  })
})

describe('noiseThreshold', () => {
  it('is 0.4 for 25 experiments and grows as the sample shrinks', () => {
    expect(noiseThreshold(25)).toBeCloseTo(0.4)
    expect(noiseThreshold(9)).toBeCloseTo(0.667, 3)
    expect(noiseThreshold(2)).toBe(1)
    expect(noiseThreshold(0)).toBe(1)
  })
})

describe('describeCorrelation', () => {
  it.each([
    [0.88, 'strong positive'],
    [-0.82, 'strong negative'],
    [0.55, 'moderate positive'],
    [-0.2, 'no clear relationship'],
    [null, 'not enough data'],
  ])('reads %s as "%s"', (r, expected) => {
    expect(describeCorrelation(r, 0.4)).toBe(expected)
  })
})

describe('with the bundled dataset', () => {
  const dataset = loadDataset()

  it('builds a full input × output matrix', () => {
    const matrix = correlationMatrix(dataset, dataset.experiments, 'pearson')
    expect(Object.keys(matrix)).toHaveLength(19)
    expect(Object.keys(matrix['Polymer 1'])).toHaveLength(5)
    expect(matrix['Polymer 4']['Elongation']).toBeCloseTo(-0.82, 2)
  })

  it('returns null cells when too few experiments are left', () => {
    const matrix = correlationMatrix(dataset, dataset.experiments.slice(0, 2), 'pearson')
    expect(matrix['Polymer 1']['Viscosity']).toBeNull()
  })

  it('describes a filter range relative to the full range', () => {
    const viscosity = dataset.variable('Viscosity')!
    const [min, max] = viscosity.extent
    expect(describeRange(viscosity, [2500, max])).toBe('≥ 2,500.0')
    expect(describeRange(viscosity, [min, 2500])).toBe('≤ 2,500.0')
    expect(describeRange(viscosity, [2400, 2800])).toBe('2,400.0 – 2,800.0')
  })

  it('has no subset until the user narrows something', () => {
    const state = initialViewState(dataset)
    expect(activeSubset(dataset, state, dataset.experiments)).toBeNull()
  })

  it('prefers the selection over the filters as the subset', () => {
    const state = initialViewState(dataset)
    const visible = dataset.experiments.slice(0, 10)
    expect(activeSubset(dataset, state, visible)).toMatchObject({ source: 'filters' })

    const selection = [visible[0].id, dataset.experiments[20].id]
    const subset = activeSubset(dataset, { ...state, selection }, visible)
    // The second id is filtered out, so only the first counts.
    expect(subset).toMatchObject({ source: 'selection', experiments: [visible[0]] })
  })

  it('ranks Plasticizer 2 first for the experiments with the lowest compression set', () => {
    const lowest = applyFilters(dataset.experiments, { 'Compression Set': [0, 52] })
    expect(lowest).toHaveLength(4)
    const [top] = subsetProfile(dataset, lowest)
    expect(top.variable.key).toBe('Plasticizer 2')
    expect(top.shift).toBeGreaterThan(2)
    expect(top.subsetMean).toBeGreaterThan(top.overallMean)
  })

  it('starts on the strongest relationship', () => {
    expect(initialViewState(dataset)).toMatchObject({
      x: 'Carbon Black High Grade',
      y: 'Viscosity',
    })
  })
})
