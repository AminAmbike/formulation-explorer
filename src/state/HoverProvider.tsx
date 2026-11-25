import { useMemo, useState, type ReactNode } from 'react'
import { HoverContext, type Hover } from './hoverContext'

export function HoverProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hover = useMemo<Hover>(() => ({ hoveredId, setHoveredId }), [hoveredId])
  return <HoverContext value={hover}>{children}</HoverContext>
}
