import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { Dataset } from '@/data'
import { ExplorerContext, type Explorer } from './explorerContext'
import { applyFilters, initialViewState } from './selectors'
import { decodeViewState, encodeViewState } from './urlSync'
import { viewStateReducer } from './viewState'

interface Props {
  dataset: Dataset
  children: ReactNode
}

/** Owns the view state and shares it with every component below. */
export function ExplorerProvider({ dataset, children }: Props) {
  const initialState = useMemo(() => initialViewState(dataset), [dataset])
  // Start from the view saved in the URL, if there is one.
  const [state, dispatch] = useReducer(viewStateReducer, initialState, (defaults) =>
    decodeViewState(window.location.search, dataset, defaults),
  )

  // Keep the URL in step with the view. replaceState, not pushState, so dragging
  // a slider does not add dozens of entries to the browser history.
  useEffect(() => {
    const query = encodeViewState(state, initialState)
    const url = query ? `?${query}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [state, initialState])

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
