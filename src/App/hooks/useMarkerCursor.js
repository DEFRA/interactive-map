import { useEffect } from 'react'
import { isStandaloneLabel } from '../../utils/symbolUtils.js'

export const useMarkerCursor = (markers, interactActive, viewportRef) => {
  useEffect(() => {
    if (!interactActive) {
      return undefined
    }
    const viewport = viewportRef.current
    if (!viewport) {
      return undefined
    }
    const onMove = (e) => {
      const hit = markers.items.some(marker => {
        if (isStandaloneLabel(marker)) {
          return false
        }
        const el = markers.markerRefs?.get(marker.id)
        if (!el) {
          return false
        }
        const { left, top, right, bottom } = el.getBoundingClientRect()
        return e.clientX >= left && e.clientX <= right && e.clientY >= top && e.clientY <= bottom
      })
      viewport.style.cursor = hit ? 'pointer' : ''
    }
    viewport.addEventListener('mousemove', onMove)
    return () => {
      viewport.removeEventListener('mousemove', onMove)
      viewport.style.cursor = ''
    }
  }, [markers, interactActive, viewportRef])
}
