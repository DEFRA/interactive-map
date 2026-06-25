import { setupHoverCursor } from './hoverCursor.js'

import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorLayer from 'ol/layer/Vector.js'

jest.mock('ol/layer/VectorTile.js', () => ({ __esModule: true, default: class VectorTileLayer {} }))
jest.mock('ol/layer/Vector.js', () => ({ __esModule: true, default: class VectorLayer {} }))

const makeViewport = () => ({ style: { cursor: '' } })

const makeMap = (forEachResult = undefined) => {
  const viewport = makeViewport()
  return {
    getViewport: () => viewport,
    forEachFeatureAtPixel: jest.fn(() => forEachResult),
    on: jest.fn(),
    un: jest.fn()
  }
}

const makeVTFeature = (styleLayerId) => ({
  get: (key) => key === 'mapbox-layer' ? { id: styleLayerId } : undefined
})

const makeVectorFeature = () => ({ get: () => undefined })

const makeVTLayer = () => {
  const layer = new VectorTileLayer()
  layer.get = () => undefined
  return layer
}

const makeVectorLayer = (layerId, isHighlight = false) => {
  const layer = new VectorLayer()
  layer.get = (key) => {
    if (key === '_highlight') return isHighlight ? true : undefined
    if (key === 'layerId') return layerId
    return undefined
  }
  return layer
}

const move = (handler, pointerType = 'mouse') =>
  handler({ pixel: [10, 10], originalEvent: { pointerType } })

describe('setupHoverCursor', () => {
  beforeEach(() => {
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation(cb => { cb(); return 0 })
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  /* ------------------------------------------------------------------ */
  /* Setup / teardown                                                   */
  /* ------------------------------------------------------------------ */

  it('returns null and clears cursor when layerIds is empty', () => {
    const map = makeMap()
    const result = setupHoverCursor(map, [], null)
    expect(result).toBeNull()
    expect(map.getViewport().style.cursor).toBe('')
    expect(map.on).not.toHaveBeenCalled()
  })

  it('returns null and clears cursor when layerIds is null', () => {
    const map = makeMap()
    const result = setupHoverCursor(map, null, null)
    expect(result).toBeNull()
    expect(map.getViewport().style.cursor).toBe('')
  })

  it('removes previous handler before attaching a new one', () => {
    const map = makeMap()
    const prev = jest.fn()
    setupHoverCursor(map, ['layer-a'], prev)
    expect(map.un).toHaveBeenCalledWith('pointermove', prev)
  })

  it('removes previous handler when clearing layers', () => {
    const map = makeMap()
    const prev = jest.fn()
    setupHoverCursor(map, [], prev)
    expect(map.un).toHaveBeenCalledWith('pointermove', prev)
  })

  it('attaches a pointermove listener and returns the handler', () => {
    const map = makeMap()
    const handler = setupHoverCursor(map, ['layer-a'], null)
    expect(typeof handler).toBe('function')
    expect(map.on).toHaveBeenCalledWith('pointermove', handler)
  })

  /* ------------------------------------------------------------------ */
  /* Pointermove — cursor state                                         */
  /* ------------------------------------------------------------------ */

  it('sets pointer cursor when an interactive VT feature is hit', () => {
    const map = makeMap(true)
    const handler = setupHoverCursor(map, ['fill-layer'], null)
    move(handler)
    expect(map.getViewport().style.cursor).toBe('pointer')
  })

  it('clears cursor when no interactive feature is hit', () => {
    const viewport = makeViewport()
    viewport.style.cursor = 'pointer'
    const map = { ...makeMap(undefined), getViewport: () => viewport }
    const handler = setupHoverCursor(map, ['fill-layer'], null)
    move(handler)
    expect(viewport.style.cursor).toBe('')
  })

  it('ignores touch pointer events', () => {
    const map = makeMap(true)
    const handler = setupHoverCursor(map, ['layer-a'], null)
    move(handler, 'touch')
    expect(map.forEachFeatureAtPixel).not.toHaveBeenCalled()
  })

  it('ignores pen pointer events', () => {
    const map = makeMap(true)
    const handler = setupHoverCursor(map, ['layer-a'], null)
    move(handler, 'pen')
    expect(map.forEachFeatureAtPixel).not.toHaveBeenCalled()
  })

  /* ------------------------------------------------------------------ */
  /* Feature matching — VectorTile layer                                */
  /* ------------------------------------------------------------------ */

  it('matches a VT feature whose mapbox-layer id is in the watched set', () => {
    const map = makeMap()
    const feature = makeVTFeature('roads')
    const layer = makeVTLayer()
    map.forEachFeatureAtPixel.mockImplementation((pixel, cb) => cb(feature, layer))

    const handler = setupHoverCursor(map, ['roads'], null)
    move(handler)
    expect(map.getViewport().style.cursor).toBe('pointer')
  })

  it('does not match a VT feature whose mapbox-layer id is not in the watched set', () => {
    const map = makeMap()
    const feature = makeVTFeature('other-layer')
    const layer = makeVTLayer()
    map.forEachFeatureAtPixel.mockImplementation((pixel, cb) => cb(feature, layer))

    const handler = setupHoverCursor(map, ['roads'], null)
    move(handler)
    expect(map.getViewport().style.cursor).toBe('')
  })

  /* ------------------------------------------------------------------ */
  /* Feature matching — Vector layer                                    */
  /* ------------------------------------------------------------------ */

  it('matches a VectorLayer feature whose layerId is in the watched set', () => {
    const map = makeMap()
    const feature = makeVectorFeature()
    const layer = makeVectorLayer('draw')
    map.forEachFeatureAtPixel.mockImplementation((pixel, cb) => cb(feature, layer))

    const handler = setupHoverCursor(map, ['draw'], null)
    move(handler)
    expect(map.getViewport().style.cursor).toBe('pointer')
  })

  it('does not match a VectorLayer feature whose layerId is not in the watched set', () => {
    const map = makeMap()
    const feature = makeVectorFeature()
    const layer = makeVectorLayer('other')
    map.forEachFeatureAtPixel.mockImplementation((pixel, cb) => cb(feature, layer))

    const handler = setupHoverCursor(map, ['draw'], null)
    move(handler)
    expect(map.getViewport().style.cursor).toBe('')
  })

  it('skips highlight overlay VectorLayers', () => {
    const map = makeMap()
    const feature = makeVectorFeature()
    const layer = makeVectorLayer('draw', true)
    map.forEachFeatureAtPixel.mockImplementation((pixel, cb) => cb(feature, layer))

    const handler = setupHoverCursor(map, ['draw'], null)
    move(handler)
    expect(map.getViewport().style.cursor).toBe('')
  })

  /* ------------------------------------------------------------------ */
  /* forEachFeatureAtPixel options                                      */
  /* ------------------------------------------------------------------ */

  it('passes hitTolerance to forEachFeatureAtPixel', () => {
    const map = makeMap()
    const handler = setupHoverCursor(map, ['layer-a'], null)
    move(handler)
    expect(map.forEachFeatureAtPixel).toHaveBeenCalledWith(
      [10, 10],
      expect.any(Function),
      { hitTolerance: 8 }
    )
  })

  /* ------------------------------------------------------------------ */
  /* RAF throttle                                                        */
  /* ------------------------------------------------------------------ */

  it('cancels a pending RAF when a second move fires before the frame', () => {
    global.requestAnimationFrame.mockImplementation(() => 42) // don't execute immediately
    const map = makeMap(true)
    const handler = setupHoverCursor(map, ['layer-a'], null)
    move(handler)
    move(handler)
    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(42)
  })

  it('calls forEachFeatureAtPixel only once per RAF even with multiple moves', () => {
    let pendingCb = null
    global.requestAnimationFrame.mockImplementation(cb => { pendingCb = cb; return 1 })
    global.cancelAnimationFrame.mockImplementation(() => { pendingCb = null })

    const map = makeMap(true)
    const handler = setupHoverCursor(map, ['layer-a'], null)
    move(handler)
    move(handler)
    move(handler)

    pendingCb?.()
    expect(map.forEachFeatureAtPixel).toHaveBeenCalledTimes(1)
  })
})
