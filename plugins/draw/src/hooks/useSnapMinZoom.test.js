import { renderHook } from '@testing-library/react'
import { useSnapMinZoom } from './useSnapMinZoom.js'

const setup = ({ mode = 'draw_polygon', zoom = 16, isUserMove = true, hasSnapLayers = true, snap = true, snapMinZoom = 16, draw = { setSnapAvailable: jest.fn() } } = {}) => {
  const hints = { show: jest.fn() }
  const props = (overrides = {}) => ({
    mapState: { zoom, isUserMove, ...overrides.mapState },
    pluginConfig: { snapMinZoom, ...overrides.pluginConfig },
    pluginState: { mode, hasSnapLayers, snap, ...overrides.pluginState },
    mapProvider: { draw },
    hints
  })
  const hook = renderHook((hookProps) => useSnapMinZoom(hookProps), { initialProps: props() })
  const rerender = (overrides) => hook.rerender(props(overrides))
  return { draw, hints, rerender }
}

describe('useSnapMinZoom', () => {
  test('makes snapping unavailable below snapMinZoom, and available again at it', () => {
    const { draw, rerender } = setup()
    expect(draw.setSnapAvailable).toHaveBeenLastCalledWith(true)
    rerender({ mapState: { zoom: 15 } })
    expect(draw.setSnapAvailable).toHaveBeenLastCalledWith(false)
    rerender({ mapState: { zoom: 16 } })
    expect(draw.setSnapAvailable).toHaveBeenLastCalledWith(true)
  })

  test('shows the hint when the user zooms below snapMinZoom with snap on', () => {
    const { hints, rerender } = setup()
    rerender({ mapState: { zoom: 15 } })
    expect(hints.show).toHaveBeenCalledWith('Zoom in to use snap')
  })

  test('shows the configured hint text', () => {
    const { hints, rerender } = setup()
    rerender({ mapState: { zoom: 15 }, pluginConfig: { snapZoomInHintText: 'Zoom in further' } })
    expect(hints.show).toHaveBeenCalledWith('Zoom in further')
  })

  test('doesn\'t show the hint again while the map stays below snapMinZoom', () => {
    const { hints, rerender } = setup()
    rerender({ mapState: { zoom: 15 } })
    rerender({ mapState: { zoom: 14 } })
    expect(hints.show).toHaveBeenCalledTimes(1)
  })

  test('doesn\'t show the hint with snap off', () => {
    const { draw, hints, rerender } = setup({ snap: false })
    rerender({ mapState: { zoom: 15 } })
    expect(draw.setSnapAvailable).toHaveBeenLastCalledWith(false)
    expect(hints.show).not.toHaveBeenCalled()
  })

  test('doesn\'t show the hint when code zoomed the map', () => {
    const { draw, hints, rerender } = setup()
    rerender({ mapState: { zoom: 15, isUserMove: false } })
    expect(draw.setSnapAvailable).toHaveBeenLastCalledWith(false)
    expect(hints.show).not.toHaveBeenCalled()
  })

  test('doesn\'t show the hint when a draw or edit starts below snapMinZoom', () => {
    const { hints, rerender } = setup({ mode: null, zoom: 12 })
    rerender({ pluginState: { mode: 'draw_polygon' } })
    expect(hints.show).not.toHaveBeenCalled()
  })

  test('doesn\'t show the hint outside a draw or edit, or without snap layers', () => {
    const outside = setup({ mode: null })
    outside.rerender({ mapState: { zoom: 15 } })
    expect(outside.hints.show).not.toHaveBeenCalled()

    const noLayers = setup({ hasSnapLayers: false })
    noLayers.rerender({ mapState: { zoom: 15 } })
    expect(noLayers.hints.show).not.toHaveBeenCalled()
  })

  test('waits for the adapter', () => {
    const { hints, rerender } = setup({ draw: null })
    rerender({ mapState: { zoom: 15 } })
    expect(hints.show).not.toHaveBeenCalled()
  })
})
