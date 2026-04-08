import { setupHoverCursor } from './hoverCursor.js'

const makeMap = (layerTypes = {}, queryResults = []) => ({
  getCanvas: () => ({ style: { cursor: '' } }),
  getLayer: (id) => layerTypes[id] ? { type: layerTypes[id] } : undefined,
  queryRenderedFeatures: jest.fn(() => queryResults),
  on: jest.fn(),
  off: jest.fn()
})

const move = (handler, x = 10, y = 10) =>
  handler({ point: { x, y } })

describe('setupHoverCursor', () => {
  /* ------------------------------------------------------------------ */
  /* Setup / teardown                                                   */
  /* ------------------------------------------------------------------ */

  it('returns null and clears cursor when layerIds is empty', () => {
    const map = makeMap()
    const result = setupHoverCursor(map, [], null)
    expect(result).toBeNull()
    expect(map.getCanvas().style.cursor).toBe('')
    expect(map.on).not.toHaveBeenCalled()
  })

  it('returns null and clears cursor when layerIds is null', () => {
    const map = makeMap()
    const result = setupHoverCursor(map, null, null)
    expect(result).toBeNull()
    expect(map.getCanvas().style.cursor).toBe('')
  })

  it('removes previous handler before attaching a new one', () => {
    const map = makeMap({ 'layer-a': 'fill' })
    const prev = jest.fn()
    setupHoverCursor(map, ['layer-a'], prev)
    expect(map.off).toHaveBeenCalledWith('mousemove', prev)
  })

  it('removes previous handler when clearing layers', () => {
    const map = makeMap()
    const prev = jest.fn()
    setupHoverCursor(map, [], prev)
    expect(map.off).toHaveBeenCalledWith('mousemove', prev)
  })

  it('attaches a mousemove listener and returns the handler', () => {
    const map = makeMap({ 'layer-a': 'fill' })
    const handler = setupHoverCursor(map, ['layer-a'], null)
    expect(typeof handler).toBe('function')
    expect(map.on).toHaveBeenCalledWith('mousemove', handler)
  })

  /* ------------------------------------------------------------------ */
  /* Mousemove — cursor state                                           */
  /* ------------------------------------------------------------------ */

  it('sets pointer cursor when a fill layer is hit', () => {
    const canvas = { style: { cursor: '' } }
    const map = { ...makeMap({ 'fill-layer': 'fill' }, [{ id: 'f1' }]), getCanvas: () => canvas }
    const handler = setupHoverCursor(map, ['fill-layer'], null)
    move(handler)
    expect(canvas.style.cursor).toBe('pointer')
  })

  it('clears cursor when no layers are hit', () => {
    const canvas = { style: { cursor: 'pointer' } }
    const map = { ...makeMap({ 'fill-layer': 'fill' }, []), getCanvas: () => canvas }
    const handler = setupHoverCursor(map, ['fill-layer'], null)
    move(handler)
    expect(canvas.style.cursor).toBe('')
  })

  it('clears cursor when no registered layers exist on the map', () => {
    const canvas = { style: { cursor: 'pointer' } }
    const map = { ...makeMap({}, []), getCanvas: () => canvas }
    const handler = setupHoverCursor(map, ['missing-layer'], null)
    move(handler)
    expect(canvas.style.cursor).toBe('')
  })

  /* ------------------------------------------------------------------ */
  /* Line layer tolerance                                               */
  /* ------------------------------------------------------------------ */

  it('uses bbox query for a pure line layer', () => {
    const map = makeMap({ hedge: 'line' }, [{ id: 'f1' }])
    const handler = setupHoverCursor(map, ['hedge'], null)
    move(handler, 50, 50)
    expect(map.queryRenderedFeatures).toHaveBeenCalledWith(
      [[40, 40], [60, 60]],
      { layers: ['hedge'] }
    )
  })

  it('sets pointer when line layer is hit via bbox', () => {
    const canvas = { style: { cursor: '' } }
    const map = { ...makeMap({ hedge: 'line' }, [{ id: 'f1' }]), getCanvas: () => canvas }
    const handler = setupHoverCursor(map, ['hedge'], null)
    move(handler)
    expect(canvas.style.cursor).toBe('pointer')
  })

  /* ------------------------------------------------------------------ */
  /* Stroke + fill companion                                            */
  /* ------------------------------------------------------------------ */

  it('skips stroke layer when a companion fill layer exists', () => {
    const map = makeMap({ poly: 'fill', 'poly-stroke': 'line' }, [])
    const handler = setupHoverCursor(map, ['poly', 'poly-stroke'], null)
    move(handler)
    // Only the fill layer should be queried (exact point), not the stroke
    expect(map.queryRenderedFeatures).toHaveBeenCalledTimes(1)
    expect(map.queryRenderedFeatures).toHaveBeenCalledWith(
      expect.objectContaining({ x: 10, y: 10 }),
      { layers: ['poly'] }
    )
  })

  it('does not skip a stroke layer that has no companion fill', () => {
    const map = makeMap({ 'hedge-stroke': 'line' }, [])
    const handler = setupHoverCursor(map, ['hedge-stroke'], null)
    move(handler)
    expect(map.queryRenderedFeatures).toHaveBeenCalledWith(
      expect.any(Array),
      { layers: ['hedge-stroke'] }
    )
  })
})
