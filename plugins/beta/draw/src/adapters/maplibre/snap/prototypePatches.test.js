import MapboxSnap from 'mapbox-gl-snap/dist/esm/MapboxSnap.js'
import { polygon, lineString } from '@turf/helpers'
import { applyMapboxSnapPatches } from './prototypePatches.js'

const SNAP_LAYER = 'snap-helper-circle'
const COLORS = { vertex: 'colour-v', midpoint: 'colour-m', edge: 'colour-e' }

jest.mock('mapbox-gl-snap/dist/esm/MapboxSnap.js', () => {
  const orig = {
    setMapData: jest.fn(function () { return 'orig-setMapData' }),
    drawingSnapCheck: jest.fn(function () { return 'orig-drawingSnapCheck' }),
    getLines: jest.fn(function () { return 'orig-getLines' }),
    getCloseFeatures: jest.fn(function () { return 'orig-getCloseFeatures' }),
    searchInVertex: jest.fn(function () { return { id: 'v' } }),
    searchInMidPoint: jest.fn(function () { return { id: 'm' } }),
    searchInEdge: jest.fn(function () { return { id: 'e' } }),
    snapToClosestPoint: jest.fn(function () { return 'orig-snap' })
  }
  const MockSnap = jest.fn()
  Object.assign(MockSnap.prototype, orig)
  MockSnap.__orig = orig
  return { __esModule: true, default: MockSnap }
})

jest.mock('@turf/helpers', () => ({
  polygon: jest.fn((c) => ({ poly: c })),
  lineString: jest.fn((c) => ({ line: c }))
}))

jest.mock('../defaults.js', () => ({ TOLERANCES: { snapRadius: 12 } }))

beforeAll(() => {
  applyMapboxSnapPatches(COLORS)
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  console.log.mockRestore()
})

describe('applyMapboxSnapPatches', () => {
  test('patches the prototype only once', () => {
    const patched = MapboxSnap.prototype.setMapData
    applyMapboxSnapPatches(COLORS)
    expect(MapboxSnap.prototype.setMapData).toBe(patched)
  })

  test('replaces changeSnappedPoints with a no-op', () => {
    expect(MapboxSnap.prototype.changeSnappedPoints()).toBeUndefined()
  })
})

describe('setMapData', () => {
  test('returns undefined and skips the original when disabled', () => {
    expect(MapboxSnap.prototype.setMapData.call({ status: false }, {})).toBeUndefined()
    expect(MapboxSnap.__orig.setMapData).not.toHaveBeenCalled()
  })

  test('delegates and shows the layer when features exist and the layer is present', () => {
    const map = { getLayer: jest.fn(() => ({})), setLayoutProperty: jest.fn() }
    const data = { features: [{}] }

    const result = MapboxSnap.prototype.setMapData.call({ status: true, map }, data)

    expect(MapboxSnap.__orig.setMapData).toHaveBeenCalledWith(data)
    expect(result).toBe('orig-setMapData')
    expect(map.setLayoutProperty).toHaveBeenCalledWith(SNAP_LAYER, 'visibility', 'visible')
  })

  test('does not show the layer when there are no features', () => {
    const map = { getLayer: jest.fn(() => ({})), setLayoutProperty: jest.fn() }
    MapboxSnap.prototype.setMapData.call({ status: true, map }, { features: [] })
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })

  test('does not show the layer when it is absent', () => {
    const map = { getLayer: jest.fn(() => null), setLayoutProperty: jest.fn() }
    MapboxSnap.prototype.setMapData.call({ status: true, map }, { features: [{}] })
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })

  test('tolerates a missing map and missing data', () => {
    expect(MapboxSnap.prototype.setMapData.call({ status: true }, { features: [{}] })).toBe('orig-setMapData')
    expect(MapboxSnap.prototype.setMapData.call({ status: true }, undefined)).toBe('orig-setMapData')
  })
})

describe('drawingSnapCheck', () => {
  test('returns undefined when disabled', () => {
    expect(MapboxSnap.prototype.drawingSnapCheck.call({ status: false })).toBeUndefined()
  })

  test('delegates to the original when enabled', () => {
    expect(MapboxSnap.prototype.drawingSnapCheck.call({ status: true })).toBe('orig-drawingSnapCheck')
    expect(MapboxSnap.__orig.drawingSnapCheck).toHaveBeenCalled()
  })
})

describe('getLines', () => {
  const call = (self, feature) => MapboxSnap.prototype.getLines.call(self, feature, 'mouse', 5)

  test('returns [] when geometry or coordinates are missing', () => {
    expect(call({}, { geometry: null })).toEqual([])
    expect(call({}, { geometry: {} })).toEqual([])
  })

  test('returns [] when coordinates are not a non-empty array', () => {
    expect(call({}, { geometry: { coordinates: 'x' } })).toEqual([])
    expect(call({}, { geometry: { coordinates: [] } })).toEqual([])
  })

  test('maps MultiPolygon coordinates via turf polygon, filtering empties', () => {
    const feature = { geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0]]], []] } }
    expect(call({}, feature)).toEqual([{ poly: [[[0, 0]]] }])
    expect(polygon).toHaveBeenCalledWith([[[0, 0]]])
  })

  test('maps MultiLineString coordinates via turf lineString', () => {
    const feature = { geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] } }
    expect(call({}, feature)).toEqual([{ line: [[0, 0], [1, 1]] }])
    expect(lineString).toHaveBeenCalledWith([[0, 0], [1, 1]])
  })

  test('delegates other geometry types to the original', () => {
    const feature = { geometry: { type: 'Polygon', coordinates: [[0, 0]] } }
    expect(call({}, feature)).toBe('orig-getLines')
    expect(MapboxSnap.__orig.getLines).toHaveBeenCalledWith(feature, 'mouse', 5)
  })

  test('returns [] when turf throws on invalid geometry', () => {
    polygon.mockImplementationOnce(() => { throw new Error('bad') })
    const feature = { geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0]]]] } }
    expect(call({}, feature)).toEqual([])
  })
})

describe('getCloseFeatures', () => {
  test('returns [] when disabled', () => {
    expect(MapboxSnap.prototype.getCloseFeatures.call({ status: false }, {}, 1)).toEqual([])
  })

  test('expands the query to a radius bbox and restores the point', () => {
    const map = { getLayer: jest.fn((l) => l === 'layerA') }
    const self = { status: true, map, _activeLayers: ['layerA', 'missing'], options: { radius: 10 } }
    const e = { point: { x: 100, y: 200 } }

    MapboxSnap.__orig.getCloseFeatures.mockImplementationOnce(function (ev) {
      expect(ev.point).toEqual([[90, 190], [110, 210]])
      return 'orig-getCloseFeatures'
    })

    const result = MapboxSnap.prototype.getCloseFeatures.call(self, e, 3)

    expect(self.options.layers).toEqual(['layerA'])
    expect(e.point).toEqual({ x: 100, y: 200 })
    expect(result).toBe('orig-getCloseFeatures')
  })

  test('falls back to default layers and the configured radius', () => {
    const map = { getLayer: jest.fn(() => true) }
    const self = { status: true, map, _activeLayers: null, _defaultLayers: ['b'], options: {} }
    const e = { point: { x: 0, y: 0 } }

    MapboxSnap.__orig.getCloseFeatures.mockImplementationOnce(function (ev) {
      expect(ev.point).toEqual([[-12, -12], [12, 12]])
      return []
    })

    MapboxSnap.prototype.getCloseFeatures.call(self, e, 1)
    expect(self.options.layers).toEqual(['b'])
  })

  test('handles a completely missing layer configuration', () => {
    const map = { getLayer: jest.fn(() => true) }
    const self = { status: true, map, options: {} }
    const e = { point: { x: 0, y: 0 } }

    MapboxSnap.prototype.getCloseFeatures.call(self, e, 1)
    expect(self.options.layers).toEqual([])
  })
})

describe('colour methods', () => {
  test('searchInVertex tints the result and passes through falsy results', () => {
    expect(MapboxSnap.prototype.searchInVertex.call({}).color).toBe(COLORS.vertex)
    MapboxSnap.__orig.searchInVertex.mockReturnValueOnce(null)
    expect(MapboxSnap.prototype.searchInVertex.call({})).toBeNull()
  })

  test('searchInMidPoint tints the result and passes through falsy results', () => {
    expect(MapboxSnap.prototype.searchInMidPoint.call({}).color).toBe(COLORS.midpoint)
    MapboxSnap.__orig.searchInMidPoint.mockReturnValueOnce(null)
    expect(MapboxSnap.prototype.searchInMidPoint.call({})).toBeNull()
  })

  test('searchInEdge tints the result and passes through falsy results', () => {
    expect(MapboxSnap.prototype.searchInEdge.call({}).color).toBe(COLORS.edge)
    MapboxSnap.__orig.searchInEdge.mockReturnValueOnce(null)
    expect(MapboxSnap.prototype.searchInEdge.call({})).toBeNull()
  })
})

describe('snapToClosestPoint', () => {
  test('skips and returns undefined when disabled', () => {
    expect(MapboxSnap.prototype.snapToClosestPoint.call({ status: false })).toBeUndefined()
    expect(MapboxSnap.__orig.snapToClosestPoint).not.toHaveBeenCalled()
  })

  test('skips while the map is zooming', () => {
    expect(MapboxSnap.prototype.snapToClosestPoint.call({ status: true, map: { _isZooming: true } }, {})).toBeUndefined()
  })

  test('delegates and trims oversized caches', () => {
    const self = { status: true, map: {}, closeFeatures: new Array(101), lines: new Array(101) }
    expect(MapboxSnap.prototype.snapToClosestPoint.call(self, {})).toBe('orig-snap')
    expect(self.closeFeatures).toHaveLength(0)
    expect(self.lines).toHaveLength(0)
  })

  test('leaves small caches intact', () => {
    const self = { status: true, map: {}, closeFeatures: [1], lines: [2] }
    MapboxSnap.prototype.snapToClosestPoint.call(self, {})
    expect(self.closeFeatures).toHaveLength(1)
    expect(self.lines).toHaveLength(1)
  })

  test('tolerates absent caches and a missing map', () => {
    expect(MapboxSnap.prototype.snapToClosestPoint.call({ status: true }, {})).toBe('orig-snap')
  })

  test('clears snap state when the original throws', () => {
    MapboxSnap.__orig.snapToClosestPoint.mockImplementationOnce(() => { throw new Error('x') })
    const self = { status: true, map: {}, snapStatus: true, snapCoords: [1, 2] }

    expect(MapboxSnap.prototype.snapToClosestPoint.call(self, {})).toBeUndefined()
    expect(self.snapStatus).toBe(false)
    expect(self.snapCoords).toBeNull()
  })
})
