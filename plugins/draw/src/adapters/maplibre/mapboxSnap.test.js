import { applyMapboxSnapPatches } from './snap/prototypePatches.js'
import { registerStyleLoadHandler, registerZoomHandlers } from './snap/mapHandlers.js'
import { createSnapInstance } from './snap/snapInstance.js'
import { initMapLibreSnap } from './mapboxSnap.js'

const DRAW_SOURCE = 'mapbox-gl-draw-hot'

jest.mock('./snap/prototypePatches.js', () => ({ applyMapboxSnapPatches: jest.fn() }))
jest.mock('./snap/mapHandlers.js', () => ({
  registerStyleLoadHandler: jest.fn(),
  registerZoomHandlers: jest.fn()
}))
jest.mock('./snap/snapInstance.js', () => ({
  createSnapInstance: jest.fn((map) => {
    map._snapInstance = { id: 'snap' }
    return map._snapInstance
  })
}))
jest.mock('./snap/sourceData.js', () => ({
  pollUntil: jest.fn((checkFn, onSuccess) => {
    const result = checkFn()
    if (result) {
      onSuccess(result)
    }
  })
}))
jest.mock('./defaults.js', () => ({
  COLORS: { snapVertex: 'v', snapMidpoint: 'm', snapEdge: 'e' },
  TOLERANCES: { snapRadius: 12 }
}))

const makeMap = (overrides = {}) => ({
  getSource: jest.fn(() => ({ id: 'hot' })),
  ...overrides
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('initMapLibreSnap', () => {
  test('returns the existing instance and skips setup when already initialized', () => {
    const map = { _snapInitialized: true, _snapInstance: { id: 'existing' } }

    expect(initMapLibreSnap(map, {}, {})).toEqual({ id: 'existing' })
    expect(applyMapboxSnapPatches).not.toHaveBeenCalled()
    expect(registerStyleLoadHandler).not.toHaveBeenCalled()
  })

  test('applies patches, registers handlers and creates the instance', () => {
    const map = makeMap()
    const draw = { id: 'draw' }

    const result = initMapLibreSnap(map, draw, { layers: ['a'] })

    expect(applyMapboxSnapPatches).toHaveBeenCalledWith({ vertex: 'v', midpoint: 'm', edge: 'e' })
    expect(registerStyleLoadHandler).toHaveBeenCalledWith(map, draw, expect.objectContaining({ layers: ['a'], radius: 12 }))
    expect(registerZoomHandlers).toHaveBeenCalledWith(map)
    expect(createSnapInstance).toHaveBeenCalledWith(map, draw, { id: 'hot' }, expect.any(Object))
    expect(map.getSource).toHaveBeenCalledWith(DRAW_SOURCE)
    expect(result).toEqual({ id: 'snap' })
  })

  test('merges custom snap colours over the defaults', () => {
    initMapLibreSnap(makeMap(), {}, { colors: { vertex: 'custom' } })
    expect(applyMapboxSnapPatches).toHaveBeenCalledWith({ vertex: 'custom', midpoint: 'm', edge: 'e' })
  })

  test('uses the configured default radius when none is supplied', () => {
    initMapLibreSnap(makeMap(), {}, {})
    expect(registerStyleLoadHandler.mock.calls[0][2].radius).toBe(12)
  })

  test('defaults snapOptions to an empty object when omitted', () => {
    const map = makeMap()
    expect(() => initMapLibreSnap(map, {})).not.toThrow()
    expect(createSnapInstance).toHaveBeenCalled()
  })

  test('provides a no-op default onSnapped handler', () => {
    initMapLibreSnap(makeMap(), {}, {})
    const passedConfig = registerStyleLoadHandler.mock.calls[0][2]
    expect(passedConfig.onSnapped()).toBeUndefined()
  })

  test('does not create an instance when the map has already been removed', () => {
    const map = makeMap({ _removed: true })
    initMapLibreSnap(map, {}, {})
    expect(createSnapInstance).not.toHaveBeenCalled()
  })
})
