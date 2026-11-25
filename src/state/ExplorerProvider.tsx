import { useMemo, useReducer, type ReactNode } from 'react'
import type { Dataset } from '@/data'
import { ExplorerContext, type Explorer } from './explorerContext'
import { applyFilters, initialViewState } from './selectors'
import { viewStateReducer } from './viewState'

interface Props {
  dataset: Dataset
  children: ReactNode
}

/** Owns the view state and shares it with every component below. */
export function ExplorerProvider({ dataset, children }: Props) {
  const initialState = useMemo(() => initialViewState(dataset), [dataset])
  const [state, dispatch] = useReducer(viewStateReducer, initialState)

  const visible = useMemo(
    () => applyFilters(dataset.experiments, state.filters),
    [dataset, state.filters],
  )

  const explorer = useMemo<Explorer>(
    () => ({ dataset, state, dispatch, visible, initialState }),
    [dataset, state, visible, initialState],
  )

  return <ExplorerContext value={explorer}>{children}</ExplorerContext>
}
