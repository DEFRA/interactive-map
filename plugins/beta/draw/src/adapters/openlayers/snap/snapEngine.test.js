import VectorLayer from 'ol/layer/Vector.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorSource from 'ol/source/Vector.js'
import { createSnapEngine } from './snapEngine.js'
import { polygonFeature } from '../__helpers__/harness.js'

// One tile covering [0,0]–[4096,4096]: band for clip artefacts = 256 units from an
// edge, axis-alignment tolerance = 2 units. Resolution 1 → 12px radius = 12 units.
const tileGrid = {
  getZForResolution: jest.fn(() => 10),
  getTileCoordForCoordAndZ: jest.fn(() => [10, 0, 0]),
  getTileCoordExtent: jest.fn(() => [0, 0, 4096, 4096])
}

const createEngineMap = () => {
  const layers = []
  return {
    layers,
    getLayers: () => ({ forEach: (cb) => layers.forEach(cb) }),
    getView: () => ({ getResolution: () => 1, getProjection: () => 'EPSG:3857' }),
    getPixelFromCoordinate: jest.fn((c) => [c[0], c[1]]),
    forEachFeatureAtPixel: jest.fn()
  }
}

const renderFeature = (type, flat, ends = null, mapboxLayer = { id: 'boundaries', type: 'line' }) => ({
  getType: () => type,
  getFlatCoordinates: () => flat,
  getEnds: () => ends,
  get: (key) => (key === 'mapbox-layer' ? mapboxLayer : undefined)
})

// map.forEachFeatureAtPixel serves two callers: candidate iteration (hitTolerance =
// snap radius) and the invisible-fill probe (hitTolerance 2, returns the callback result)
const setupVT = ({ features, withTileGrid = true, fillNeighbour = false }) => {
  const map = createEngineMap()
  const vtLayer = new VectorTileLayer({})
  if (withTileGrid) {
    jest.spyOn(vtLayer, 'getSource').mockReturnValue({ getTileGrid: () => tileGrid, getProjection: () => null })
  }
  map.layers.push(vtLayer)
  map.forEachFeatureAtPixel.mockImplementation((pixel, visit, opts) => {
    // Honour the layerFilter the way OL does — only tile layers are consulted
    if (!opts.layerFilter(vtLayer)) {
      return undefined
    }
    if (opts.hitTolerance === 2) {
      return fillNeighbour ? visit({ get: () => ({ id: 'fills' }) }) : undefined
    }
    features.forEach((f) => visit(f, vtLayer))
    return undefined
  })
  return { map, engine: createSnapEngine(map, ['boundaries', 'fills']) }
}

afterEach(() => jest.clearAllMocks())

describe('plain vector layers', () => {
  test('snaps to features near the query, skipping layers without a source', () => {
    const map = createEngineMap()
    const source = new VectorSource()
    source.addFeature(polygonFeature([[0, 0], [100, 0], [100, 100], [0, 0]]))
    const engine = createSnapEngine(map, [new VectorLayer({ source }), new VectorLayer({})])
    expect(engine.query([98, 2], 12)).toEqual({ type: 'vertex', coord: [100, 0] })
    expect(engine.query([500, 500], 12)).toBeNull()
  })

  test('setLayers swaps targets at runtime and ignores unsupported entries', () => {
    const map = createEngineMap()
    const source = new VectorSource()
    source.addFeature(polygonFeature([[0, 0], [100, 0], [100, 100], [0, 0]]))
    const engine = createSnapEngine(map, [new VectorLayer({ source }), 42])
    expect(engine.query([98, 2], 12)).not.toBeNull()
    engine.setLayers([])
    expect(engine.query([98, 2], 12)).toBeNull()
  })

  test('no resolution (map not ready) means no snapping', () => {
    const map = createEngineMap()
    map.getView = () => ({ getResolution: () => undefined })
    expect(createSnapEngine(map, ['boundaries']).query([0, 0], 12)).toBeNull()
  })
})

describe('vector-tile layers', () => {
  test('snaps to configured tile layers only, mid-tile axis alignment is fine', () => {
    // Horizontal segment mid-tile: axis-aligned but nowhere near a tile edge → real geometry
    const { engine } = setupVT({
      features: [
        renderFeature('LineString', [500, 2000, 1500, 2000]),
        renderFeature('LineString', [590, 2000, 610, 2000], null, { id: 'not-configured', type: 'line' })
      ]
    })
    expect(engine.query([600, 2005], 12)).toEqual({ type: 'edge', coord: [600, 2000] })
  })

  test('without any tile layer on the map, tile snapping is skipped entirely', () => {
    const map = createEngineMap()
    const engine = createSnapEngine(map, ['boundaries'])
    expect(engine.query([600, 2005], 12)).toBeNull()
    expect(map.forEachFeatureAtPixel).not.toHaveBeenCalled()
  })

  test('clip artefacts are rejected: axis-aligned segments hugging a tile edge', () => {
    // Vertical segment at x=1, well inside the 256-unit band of the tile's left edge
    const { engine } = setupVT({ features: [renderFeature('LineString', [1, 500, 1, 1500])] })
    expect(engine.query([5, 1000], 12)).toBeNull()
  })

  test('clip-cut vertices are rejected while their real edges survive', () => {
    // The vertex at [1,1000] ends a clip segment (vertical along x=1); the horizontal
    // edge leaving it at y=1000 is real geometry. The vertex would normally beat the
    // edge — filtering it lets the edge win.
    const { engine } = setupVT({ features: [renderFeature('LineString', [1, 500, 1, 1000, 800, 1000])] })
    expect(engine.query([6, 1004], 12)).toMatchObject({ type: 'edge' })
  })

  test('without a tile grid the clip filter degrades gracefully and keeps candidates', () => {
    const { engine } = setupVT({
      features: [renderFeature('LineString', [1, 500, 1, 1500])],
      withTileGrid: false
    })
    expect(engine.query([5, 1000], 12)).toEqual({ type: 'edge', coord: [1, 1000] })
  })

  test('the tile boundary state is computed once per layer per query', () => {
    const { engine } = setupVT({
      features: [
        renderFeature('LineString', [500, 2000, 1500, 2000]),
        renderFeature('LineString', [500, 2020, 1500, 2020])
      ]
    })
    engine.query([600, 2005], 12)
    expect(tileGrid.getZForResolution).toHaveBeenCalledTimes(1)
  })
})

describe('invisible shared fill boundaries', () => {
  const fillSquare = renderFeature(
    'Polygon', [1000, 1000, 3000, 1000, 3000, 3000, 1000, 3000], [8], { id: 'fills', type: 'fill' })

  test('an edge with the same fill on both sides is skipped; a visible outer edge snaps', () => {
    const invisible = setupVT({ features: [fillSquare], fillNeighbour: true })
    expect(invisible.engine.query([2000, 995], 12)).toBeNull()

    const visible = setupVT({ features: [fillSquare], fillNeighbour: false })
    expect(visible.engine.query([2000, 995], 12)).toEqual({ type: 'edge', coord: [2000, 1000] })
  })

  test('a cursor already on the edge, or an unprojectable probe, skips the direction check', () => {
    const onEdge = setupVT({ features: [fillSquare], fillNeighbour: true })
    expect(onEdge.engine.query([2000, 1000], 12)).toEqual({ type: 'edge', coord: [2000, 1000] })

    const blindProbe = setupVT({ features: [fillSquare], fillNeighbour: true })
    blindProbe.map.getPixelFromCoordinate.mockReturnValueOnce([2000, 995]).mockReturnValueOnce(null)
    expect(blindProbe.engine.query([2000, 995], 12)).toEqual({ type: 'edge', coord: [2000, 1000] })
  })
})

test('debug logging traces queries, candidates and filtering when enabled', () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {})
  globalThis.DEBUG_SNAP_VISIBILITY = true
  try {
    const { engine } = setupVT({ features: [renderFeature('LineString', [1, 500, 1, 1500])] })
    engine.query([5, 1000], 12)
    const topics = log.mock.calls.map(([topic]) => topic)
    expect(topics).toContain('[snap-query]')
    expect(topics).toContain('[snap-candidate-found]')
    expect(topics).toContain('[snap-filtered] tile clip artefact')
  } finally {
    delete globalThis.DEBUG_SNAP_VISIBILITY
    log.mockRestore()
  }
})
