import { useState, type PointerEvent } from 'react'
import { rectFromCorners, type Point, type Rect } from '@/components/charts/geometry'

/** A press that moves less than this many pixels counts as a click, not a drag. */
const CLICK_TOLERANCE = 4

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

/**
 * Click-and-drag rectangle selection.
 *
 * Spread `handlers` onto the element that should receive the drag and draw
 * `rect` while it is not null. Coordinates are relative to that element.
 */
export function useBrush({ onBrush, onClick }: Options) {
  const [drag, setDrag] = useState<{ start: Point; current: Point } | null>(null)

  const hasMoved =
    drag !== null &&
    Math.hypot(drag.current.x - drag.start.x, drag.current.y - drag.start.y) > CLICK_TOLERANCE

  const handlers = {
    onPointerDown(event: PointerEvent<Element>) {
      if (event.button !== 0) return
      // Capture keeps the drag alive when the pointer leaves the element.
      event.currentTarget.setPointerCapture(event.pointerId)
      const point = localPoint(event)
      setDrag({ start: point, current: point })
    },
    onPointerMove(event: PointerEvent<Element>) {
      if (drag === null) return
      setDrag({ start: drag.start, current: localPoint(event) })
    },
    onPointerUp() {
      if (drag === null) return
      if (hasMoved) onBrush(rectFromCorners(drag.start, drag.current))
      else onClick(drag.start)
      setDrag(null)
    },
    onPointerCancel() {
      setDrag(null)
    },
  }

  return {
    /** The rectangle being dragged, or null when there is no drag in progress. */
    rect: hasMoved ? rectFromCorners(drag.start, drag.current) : null,
    isDragging: drag !== null,
    handlers,
  }
}
