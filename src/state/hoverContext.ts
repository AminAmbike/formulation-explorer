import { createContext, useContext } from 'react'

export interface Hover {
  /** Id of the experiment under the pointer in any view, or null. */
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
}

export const HoverContext = createContext<Hover | null>(null)

/**
 * Hover is kept apart from the main view state because it changes on every
 * pointer move: only the components that highlight a hovered experiment
 * subscribe to it, so the rest of the page does not re-render.
 */
export function useHover(): Hover {
  const hover = useContext(HoverContext)
  if (hover === null) {
    throw new Error('useHover must be used inside <HoverProvider>.')
  }
  return hover
}
