import { createContext, useContext, type Dispatch } from 'react'
import type { Dataset, Experiment } from '@/data'
import type { Action, ViewState } from './viewState'

export interface Explorer {
  dataset: Dataset
  state: ViewState
  /** Send an Action to change the view state. */
  dispatch: Dispatch<Action>
  /** The experiments that pass the active filters. */
  visible: Experiment[]
  /** The state the page starts in, used by Reset. */
  initialState: ViewState
}

export const ExplorerContext = createContext<Explorer | null>(null)

/** Access the dataset, the view state and dispatch from any component. */
export function useExplorer(): Explorer {
  const explorer = useContext(ExplorerContext)
  if (explorer === null) {
    throw new Error('useExplorer must be used inside <ExplorerProvider>.')
  }
  return explorer
}
