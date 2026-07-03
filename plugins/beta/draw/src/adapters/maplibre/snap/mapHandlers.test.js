import { registerStyleLoadHandler, registerZoomHandlers } from './mapHandlers.js'
import { createSnapInstance, ensureSnapLayer } from './snapInstance.js'
import { patchSourceData } from './sourceData.js'

const SNAP_LAYER = 'snap-helper-circle'
const DRAW_SOURCE = 'mapbox-gl-draw-hot'

jest.mock('./snapInstance.js', () => ({
  createSnapInstance: jest.fn(),
  ensureSnapLayer: jest.fn()
}))

jest.mock('./sourceData.js', () => ({
  ...jest.requireActual('./sourceData.js'),
  patchSourceData: jest.fn()
}))

const config = { layers: [], radius: 12, rules: [], status: false, onSnapped: () => {} }

const handlerFor = (map, name) => map.on.mock.calls.find(([event]) => event === name)?.[1]

const makeMap = (overrides = {}) => ({
  on: jest.fn(),
  getSource: jest.fn((id) => (id === DRAW_SOURCE ? { id: 'hot' } : null)),
  getLayer: jest.fn(() => null),
  setLayoutProperty: jest.fn(),
  ...overrides
})

beforeEach(() => {
  jest.clearAllMocks()
  global.requestAnimationFrame = jest.fn()
})

describe('registerStyleLoadHandler', () => {
  test('re-patches the source, ensures the layer and creates a missing instance', () => {
    const map = makeMap()
    const draw = { id: 'draw' }

    registerStyleLoadHandler(map, draw, config)
    handlerFor(map, 'style.load')()

    expect(patchSourceData).toHaveBeenCalledWith({ id: 'hot' })
    expect(ensureSnapLayer).toHaveBeenCalledWith(map)
    expect(createSnapInstance).toHaveBeenCalledWith(map, draw, { id: 'hot' }, config)
  })

  test('does not recreate an existing instance', () => {
    const map = makeMap({ _snapInstance: { id: 'exists' } })

    registerStyleLoadHandler(map, {}, config)
    handlerFor(map, 'style.load')()

    expect(ensureSnapLayer).toHaveBeenCalledWith(map)
    expect(createSnapInstance).not.toHaveBeenCalled()
  })

  test('stops when the map has been removed', () => {
    const map = makeMap({ _removed: true })

    registerStyleLoadHandler(map, {}, config)
    handlerFor(map, 'style.load')()

    expect(ensureSnapLayer).not.toHaveBeenCalled()
    expect(createSnapInstance).not.toHaveBeenCalled()
  })
})

describe('registerZoomHandlers', () => {
  test('zoomstart sets the zooming flag', () => {
    const map = makeMap()
    registerZoomHandlers(map)
    handlerFor(map, 'zoomstart')()
    expect(map._isZooming).toBe(true)
  })

  test('zoomend clears the flag and re-shows the indicator when snapping is active', () => {
    const map = makeMap({ getLayer: jest.fn(() => ({ id: 'layer' })), _snapInstance: { status: true } })

    registerZoomHandlers(map)
    handlerFor(map, 'zoomend')()

    expect(map._isZooming).toBe(false)
    expect(map.setLayoutProperty).toHaveBeenCalledWith(SNAP_LAYER, 'visibility', 'none')
    expect(map.setLayoutProperty).toHaveBeenCalledWith(SNAP_LAYER, 'visibility', 'visible')
  })

  test('zoomend hides but does not re-show when snapping is disabled', () => {
    const map = makeMap({ getLayer: jest.fn(() => ({ id: 'layer' })), _snapInstance: { status: false } })

    registerZoomHandlers(map)
    handlerFor(map, 'zoomend')()

    expect(map.setLayoutProperty).toHaveBeenCalledTimes(1)
    expect(map.setLayoutProperty).toHaveBeenCalledWith(SNAP_LAYER, 'visibility', 'none')
  })

  test('zoomend does nothing when the snap layer is absent', () => {
    const map = makeMap({ getLayer: jest.fn(() => null) })

    registerZoomHandlers(map)
    handlerFor(map, 'zoomend')()

    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })
})
