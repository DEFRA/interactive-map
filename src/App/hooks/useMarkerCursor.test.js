import { renderHook, act } from '@testing-library/react'
import { useMarkerCursor } from './useMarkerCursor.js'

const HIT_BOUNDS = { left: 10, top: 10, right: 50, bottom: 50 }
const CURSOR_INSIDE = { clientX: 20, clientY: 20 }
const CURSOR_OUTSIDE = { clientX: 100, clientY: 100 }

const makeMarker = (overrides = {}) => ({ id: 'marker-1', isVisible: true, symbol: 'pin', ...overrides })

const makeMarkers = (marker, bounds) => {
  const markerRefs = new Map()
  if (bounds) markerRefs.set(marker.id, { getBoundingClientRect: () => bounds })
  return { items: [marker], markerRefs }
}

const fireMove = (vp, { clientX, clientY }) => act(() => {
  vp.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }))
})

let viewport

beforeEach(() => {
  viewport = document.createElement('div')
  viewport.className = 'im-c-viewport'
  document.body.appendChild(viewport)
})

afterEach(() => { viewport.remove() })

describe('useMarkerCursor — inactive guards', () => {
  it('does not track cursor when interactActive is false', () => {
    const markers = makeMarkers(makeMarker(), HIT_BOUNDS)
    renderHook(() => useMarkerCursor(markers, false, { current: viewport }))
    fireMove(viewport, CURSOR_INSIDE)
    expect(viewport.style.cursor).toBe('')
  })

  it('does not track cursor when viewport ref is null', () => {
    const markers = makeMarkers(makeMarker(), HIT_BOUNDS)
    renderHook(() => useMarkerCursor(markers, true, { current: null }))
    fireMove(viewport, CURSOR_INSIDE)
    expect(viewport.style.cursor).toBe('')
  })
})

describe('useMarkerCursor — cursor tracking', () => {
  it('sets cursor to pointer when mousemove lands inside a marker', () => {
    const markers = makeMarkers(makeMarker(), HIT_BOUNDS)
    renderHook(() => useMarkerCursor(markers, true, { current: viewport }))
    fireMove(viewport, CURSOR_INSIDE)
    expect(viewport.style.cursor).toBe('pointer')
  })

  it('cursor stays empty when mousemove is outside all markers', () => {
    const markers = makeMarkers(makeMarker(), HIT_BOUNDS)
    renderHook(() => useMarkerCursor(markers, true, { current: viewport }))
    fireMove(viewport, CURSOR_OUTSIDE)
    expect(viewport.style.cursor).toBe('')
  })

  it('cursor stays empty when marker has no ref element', () => {
    const markers = makeMarkers(makeMarker(), null)
    renderHook(() => useMarkerCursor(markers, true, { current: viewport }))
    fireMove(viewport, CURSOR_INSIDE)
    expect(viewport.style.cursor).toBe('')
  })

  it('skips standalone label markers in the cursor hit test', () => {
    const marker = makeMarker({ label: 'lbl', symbol: null, symbolSvgContent: null })
    const markers = makeMarkers(marker, HIT_BOUNDS)
    renderHook(() => useMarkerCursor(markers, true, { current: viewport }))
    fireMove(viewport, CURSOR_INSIDE)
    expect(viewport.style.cursor).toBe('')
  })

  it('clears cursor when interactActive becomes false', () => {
    const markers = makeMarkers(makeMarker(), HIT_BOUNDS)
    const { rerender } = renderHook(
      ({ active }) => useMarkerCursor(markers, active, { current: viewport }),
      { initialProps: { active: true } }
    )
    fireMove(viewport, CURSOR_INSIDE)
    expect(viewport.style.cursor).toBe('pointer')
    act(() => rerender({ active: false }))
    expect(viewport.style.cursor).toBe('')
  })
})
