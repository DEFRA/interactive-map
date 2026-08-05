import MapboxSnap from 'mapbox-gl-snap/dist/esm/MapboxSnap.js'
import { patchSourceData } from './sourceData.js'
import { createSnapInstance, ensureSnapLayer } from './snapInstance.js'

const SNAP_LAYER = 'snap-helper-circle'

jest.mock('mapbox-gl-snap/dist/esm/MapboxSnap.js', () => ({
  __esModule: true,
  default: jest.fn(function (opts) { Object.assign(this, opts) })
}))

jest.mock('./sourceData.js', () => ({ patchSourceData: jest.fn() }))

const config = { layers: ['a'], radius: 12, rules: ['vertex'], status: false, onSnapped: () => {} }

const makeMap = (overrides = {}) => ({
  getLayer: jest.fn(() => null),
  removeLayer: jest.fn(),
  getSource: jest.fn(() => null),
  removeSource: jest.fn(),
  addSource: jest.fn(),
  addLayer: jest.fn(),
  ...overrides
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createSnapInstance', () => {
  test('constructs the snap instance, patches the source and stores it on the map', () => {
    const map = makeMap()
    const draw = { id: 'draw' }
    const source = { id: 'src' }

    const snap = createSnapInstance(map, draw, source, config)

    expect(patchSourceData).toHaveBeenCalledWith(source)
    expect(MapboxSnap).toHaveBeenCalledWith({
      map,
      drawing: draw,
      options: { layers: ['a'], radius: 12, rules: ['vertex'] },
      status: false,
      onSnapped: config.onSnapped
    })
    expect(map._snapInstance).toBe(snap)
  })

  test('returns the existing instance without recreating', () => {
    const map = makeMap({ _snapInstance: { id: 'existing' } })
    expect(createSnapInstance(map, {}, {}, config)).toEqual({ id: 'existing' })
    expect(MapboxSnap).not.toHaveBeenCalled()
  })

  test('bails out while another creation is in progress', () => {
    const map = makeMap({ _snapCreating: true })
    createSnapInstance(map, {}, {}, config)
    expect(MapboxSnap).not.toHaveBeenCalled()
  })

  test('removes a stale snap layer and source before creating', () => {
    const map = makeMap({ getLayer: jest.fn(() => ({})), getSource: jest.fn(() => ({})) })
    createSnapInstance(map, {}, {}, config)
    expect(map.removeLayer).toHaveBeenCalledWith(SNAP_LAYER)
    expect(map.removeSource).toHaveBeenCalledWith(SNAP_LAYER)
  })

  test('exposes an externally-controlled status via setSnapStatus', () => {
    const map = makeMap()
    const draw = { getMode: jest.fn(() => 'draw_polygon') }
    const snap = createSnapInstance(map, draw, {}, { ...config, status: false })

    expect(snap.status).toBe(false)
    snap.status = true // library write ignored
    expect(snap.status).toBe(false)
    snap.setSnapStatus(true)
    expect(snap.status).toBe(true)
  })

  test('status is false outside draw/edit modes even when the toggle is on', () => {
    const map = makeMap()
    const draw = { getMode: jest.fn(() => 'simple_select') }
    const snap = createSnapInstance(map, draw, {}, { ...config, status: false })

    snap.setSnapStatus(true)
    expect(snap.status).toBe(false)

    draw.getMode.mockReturnValue('edit_vertex')
    expect(snap.status).toBe(true)
  })

  test('setSnapLayers overrides, resets and ignores invalid input', () => {
    const map = makeMap()
    const snap = createSnapInstance(map, {}, {}, { ...config, layers: ['a'] })

    expect(snap._defaultLayers).toEqual(['a'])
    expect(snap._activeLayers).toBeNull()

    snap.setSnapLayers(['b', 'c'])
    expect(snap._activeLayers).toEqual(['b', 'c'])

    snap.setSnapLayers(null)
    expect(snap._activeLayers).toBeNull()

    snap.setSnapLayers(['d'])
    snap.setSnapLayers(undefined)
    expect(snap._activeLayers).toBeNull()

    snap.setSnapLayers(['x'])
    snap.setSnapLayers('not-an-array') // no action
    expect(snap._activeLayers).toEqual(['x'])
  })

  test('applies pending snap layers set before the instance was ready', () => {
    const map = makeMap({ _pendingSnapLayers: ['pending'] })
    const snap = createSnapInstance(map, {}, {}, { ...config, layers: ['default'] })

    expect(snap._activeLayers).toEqual(['pending'])
    expect(map._pendingSnapLayers).toBeUndefined()
  })
})

describe('ensureSnapLayer', () => {
  test('adds the missing source and layer (hidden when snapping is disabled)', () => {
    const map = makeMap()
    ensureSnapLayer(map)

    expect(map.addSource).toHaveBeenCalledWith(SNAP_LAYER, expect.objectContaining({ type: 'geojson' }))
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: SNAP_LAYER,
      layout: { visibility: 'none' }
    }))
  })

  test('shows the layer when snapping is active', () => {
    const map = makeMap({ _snapInstance: { status: true } })
    ensureSnapLayer(map)

    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      layout: { visibility: 'visible' }
    }))
  })

  test('does not re-add an existing source or layer', () => {
    const map = makeMap({ getSource: jest.fn(() => ({})), getLayer: jest.fn(() => ({})) })
    ensureSnapLayer(map)

    expect(map.addSource).not.toHaveBeenCalled()
    expect(map.addLayer).not.toHaveBeenCalled()
  })
})
