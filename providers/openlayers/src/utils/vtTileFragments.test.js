import TileState from 'ol/TileState.js'
import { renderFeatureToGeoJSON, collectTileFragments } from './vtTileFragments.js'

jest.mock('ol/TileState.js', () => ({ __esModule: true, default: { LOADED: 'loaded', LOADING: 'loading' } }))
jest.mock('ol/format/GeoJSON.js', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    writeGeometryObject: jest.fn(geom => ({ type: 'mock-real-feature', geom }))
  }))
}))

describe('renderFeatureToGeoJSON', () => {
  const makeRenderFeature = (type, flat, extra = {}) => ({
    getType: () => type,
    getFlatCoordinates: () => flat,
    ...extra
  })

  it('converts a Point', () => {
    const feature = makeRenderFeature('Point', [1, 2])
    expect(renderFeatureToGeoJSON(feature)).toEqual({ type: 'Point', coordinates: [1, 2] })
  })

  it('converts a LineString', () => {
    const feature = makeRenderFeature('LineString', [0, 0, 1, 1, 2, 2])
    expect(renderFeatureToGeoJSON(feature)).toEqual({ type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] })
  })

  it('converts a Polygon using getEnds for ring boundaries', () => {
    const flat = [0, 0, 1, 0, 1, 1, 0, 0]
    const feature = makeRenderFeature('Polygon', flat, { getEnds: () => [8] })
    expect(renderFeatureToGeoJSON(feature)).toEqual({
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]]
    })
  })

  it('converts a Polygon with a hole (two rings)', () => {
    const outer = [0, 0, 4, 0, 4, 4, 0, 0]
    const hole = [1, 1, 2, 1, 2, 2, 1, 1]
    const flat = [...outer, ...hole]
    const feature = makeRenderFeature('Polygon', flat, { getEnds: () => [8, 16] })
    const result = renderFeatureToGeoJSON(feature)
    expect(result.coordinates).toHaveLength(2)
    expect(result.coordinates[1]).toEqual([[1, 1], [2, 1], [2, 2], [1, 1]])
  })

  it('converts a MultiPolygon using getEndss for polygon/ring boundaries', () => {
    const poly1 = [0, 0, 1, 0, 1, 1, 0, 0]
    const poly2 = [2, 2, 3, 2, 3, 3, 2, 2]
    const flat = [...poly1, ...poly2]
    const feature = makeRenderFeature('MultiPolygon', flat, { getEndss: () => [[8], [16]] })
    const result = renderFeatureToGeoJSON(feature)
    expect(result.coordinates).toEqual([
      [[[0, 0], [1, 0], [1, 1], [0, 0]]],
      [[[2, 2], [3, 2], [3, 3], [2, 2]]]
    ])
  })

  it('falls back to a flat pairs conversion for MultiPoint/MultiLineString', () => {
    const feature = makeRenderFeature('MultiPoint', [0, 0, 1, 1])
    expect(renderFeatureToGeoJSON(feature)).toEqual({ type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] })
  })
})

describe('collectTileFragments', () => {
  const makeTile = (features, state = TileState.LOADED) => ({
    getState: () => state,
    getFeatures: () => features
  })

  const makeVtLayer = (layerId, sourceTiles) => ({
    get: (key) => {
      if (key === 'layerType') return 'vectorTile'
      if (key === 'layerId') return layerId
      return undefined
    },
    getSource: () => ({ sourceTiles_: sourceTiles })
  })

  const makeMap = (layers) => ({ getLayers: () => ({ forEach: cb => layers.forEach(cb) }) })

  // draw-ol's basemap MVT convention: a RenderFeature with a 'mapbox-layer' object.
  const makeMapboxFeature = (styleLayerId, id, flat = [1, 2]) => ({
    get: (key) => key === 'mapbox-layer' ? { id: styleLayerId } : undefined,
    getId: () => id,
    getType: () => 'Point',
    getFlatCoordinates: () => flat
  })

  // datasets-plugin tiles-backed convention: a real ol/Feature, no 'mapbox-layer', identified
  // purely by which OL *layer* it came from (mapLayer.get('layerId')).
  const makeDatasetFeature = (id) => ({
    get: () => undefined,
    getId: () => id,
    getGeometry: () => ({ type: 'Point', coordinates: [3, 4] })
  })

  it('returns fragments for a matching mapbox-layer (basemap MVT) feature', () => {
    const feature = makeMapboxFeature('roads', 1)
    const layer = makeVtLayer(undefined, { a: makeTile([feature]) })
    const result = collectTileFragments(makeMap([layer]), 'roads', 1)
    expect(result).toEqual([{ type: 'Point', coordinates: [1, 2] }])
  })

  it('returns fragments for a matching datasets-plugin tiles-backed feature, via the layer\'s own layerId', () => {
    const feature = makeDatasetFeature('f1')
    const layer = makeVtLayer('existing-fields', { a: makeTile([feature]) })
    const result = collectTileFragments(makeMap([layer]), 'existing-fields', 'f1')
    expect(result).toEqual([{ type: 'mock-real-feature', geom: { type: 'Point', coordinates: [3, 4] } }])
  })

  it('does not call the RenderFeature-only conversion for a real ol/Feature', () => {
    // A real ol/Feature has no getFlatCoordinates/getType — calling renderFeatureToGeoJSON on
    // it would throw. This proves collectTileFragments takes the getGeometry() branch instead.
    const feature = makeDatasetFeature('f1')
    const layer = makeVtLayer('existing-fields', { a: makeTile([feature]) })
    expect(() => collectTileFragments(makeMap([layer]), 'existing-fields', 'f1')).not.toThrow()
  })

  it('matches a dataset feature using idProperty when given', () => {
    const feature = { get: (k) => k === 'ref' ? 'abc' : undefined, getGeometry: () => ({ type: 'Point', coordinates: [0, 0] }) }
    const layer = makeVtLayer('existing-fields', { a: makeTile([feature]) })
    const result = collectTileFragments(makeMap([layer]), 'existing-fields', 'abc', 'ref')
    expect(result).toHaveLength(1)
  })

  it('skips a feature whose styleLayerId does not match', () => {
    const feature = makeDatasetFeature('f1')
    const layer = makeVtLayer('hedge-control', { a: makeTile([feature]) })
    expect(collectTileFragments(makeMap([layer]), 'existing-fields', 'f1')).toEqual([])
  })

  it('skips a feature whose id does not match', () => {
    const feature = makeDatasetFeature('other-id')
    const layer = makeVtLayer('existing-fields', { a: makeTile([feature]) })
    expect(collectTileFragments(makeMap([layer]), 'existing-fields', 'f1')).toEqual([])
  })

  it('skips tiles that are not loaded', () => {
    const feature = makeDatasetFeature('f1')
    const layer = makeVtLayer('existing-fields', { a: makeTile([feature], TileState.LOADING) })
    expect(collectTileFragments(makeMap([layer]), 'existing-fields', 'f1')).toEqual([])
  })

  it('skips layers with no loaded tiles yet', () => {
    const layer = makeVtLayer('existing-fields', undefined)
    expect(collectTileFragments(makeMap([layer]), 'existing-fields', 'f1')).toEqual([])
  })

  it('skips layers that are not vectorTile-tagged', () => {
    const otherLayer = { get: () => 'vector', getSource: () => ({}) }
    expect(collectTileFragments(makeMap([otherLayer]), 'existing-fields', 'f1')).toEqual([])
  })

  it('collects fragments split across multiple loaded tiles', () => {
    const feature1 = makeDatasetFeature('f1')
    const feature2 = makeDatasetFeature('f1')
    const layer = makeVtLayer('existing-fields', { a: makeTile([feature1]), b: makeTile([feature2]) })
    expect(collectTileFragments(makeMap([layer]), 'existing-fields', 'f1')).toHaveLength(2)
  })
})
