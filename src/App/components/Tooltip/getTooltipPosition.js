const TOLERANCE = 50 // pixels

export function getTooltipPosition (triggerEl, containerEl) {
  if (!triggerEl) {
    return 'bottom'
  }

  if (!containerEl) {
    containerEl = triggerEl.closest('.im-o-app__main')
  }

  const triggerRect = triggerEl.getBoundingClientRect()
  const containerRect = containerEl.getBoundingClientRect()

  const space = {
    top: triggerRect.top - containerRect.top,
    bottom: containerRect.bottom - triggerRect.bottom,
    left: triggerRect.left - containerRect.left,
    right: containerRect.right - triggerRect.right
  }

  // Step 1: Find the actual smallest space
  const entries = Object.entries(space)
  const sorted = entries.toSorted(([, a], [, b]) => a - b)
  const [leastSide, leastValue] = sorted[0]

  // Step 2: Prefer horizontal if it's close in smallness
  if ((leastSide === 'top' || leastSide === 'bottom')) {
    for (const [side, value] of entries) {
      if ((side === 'left' || side === 'right') && Math.abs(value - leastValue) <= TOLERANCE) {
        return side === 'left' ? 'right' : 'left' // show on opposite side
      }
    }
  }

  const oppositeSideMap = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
  }

  return oppositeSideMap[leastSide]
}
