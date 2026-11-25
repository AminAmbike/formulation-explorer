import { useRef, useState, type PointerEvent } from 'react'
import { rectFromCorners, type Point, type Rect } from '@/components/charts/geometry'

/** A press that moves less than this many pixels counts as a click, not a drag. */
const CLICK_TOLERANCE = 4

interface Drag {
  start: Point
  current: Point
}

interface Options {
  /** Called with the dragged rectangle when the pointer is released. */
  onBrush: (rect: Rect) => void
  /** Called instead of onBrush when the pointer barely moved. */
  onClick: (point: Point) => void
}

/** Pointer position relative to the element the handlers are attached to. */
export function localPoint(event: PointerEvent<Element>): Point {
  const box = event.currentTarget.getBoundingClientRect()
  return { x: event.clientX - box.left, y: event.clientY - box.top }
}

function hasMoved(drag: Drag): boolean {
  return (
    Math.hypot(drag.current.x - drag.start.x, drag.current.y - drag.start.y) > CLICK_TOLERANCE
  )
}

/**
 * Click-and-drag rectangle selection.
 *
 * Spread `handlers` onto the element that should receive the drag and draw
 * `rect` while it is not null. Coordinates are relative to that element.
 */
export function useBrush({ onBrush, onClick }: Options) {
  // The ref is the source of truth for the handlers. Pointer events can arrive
  // faster than React re-renders, so a handler reading only state could still
  // see "no drag" on pointer-up and drop a quick drag entirely.
  const dragRef = useRef<Drag | null>(null)
  // The state copy exists only so the rectangle re-draws as the pointer moves.
  const [drag, setDrag] = useState<Drag | null>(null)

  const update = (next: Drag | null) => {
    dragRef.current = next
    setDrag(next)
  }

  const handlers = {
    onPointerDown(event: PointerEvent<Element>) {
      if (event.button !== 0) return
      // Capture keeps the drag alive when the pointer leaves the element.
      event.currentTarget.setPointerCapture(event.pointerId)
      const point = localPoint(event)
      update({ start: point, current: point })
    },
    onPointerMove(event: PointerEvent<Element>) {
      const active = dragRef.current
      if (active === null) return
      update({ start: active.start, current: localPoint(event) })
    },
    onPointerUp(event: PointerEvent<Element>) {
      const active = dragRef.current
      if (active === null) return
      // Use the release position too, in case no move event arrived before it.
      const finished = { start: active.start, current: localPoint(event) }
      update(null)
      if (hasMoved(finished)) onBrush(rectFromCorners(finished.start, finished.current))
      else onClick(finished.start)
    },
    onPointerCancel() {
      update(null)
    },
  }

  return {
    /** The rectangle being dragged, or null when there is no drag in progress. */
    rect: drag !== null && hasMoved(drag) ? rectFromCorners(drag.start, drag.current) : null,
    isDragging: drag !== null,
    handlers,
  }
}
