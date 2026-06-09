import { queryFeatures } from './queryFeatures.js'

import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorLayer from 'ol/layer/Vector.js'
import { renderFeatureToGeoJSON } from './vtTileFragments.js'

jest.mock('ol/layer/VectorTile.js', () => ({ __esModule: true, default: class VectorTileLayer {} }))
jest.mock('ol/layer/Vector.js', () => ({ __esModule: true, default: class VectorLayer {} }))
jest.mock('ol/format/GeoJSON.js', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    writeGeometryObject: jest.fn(geom => ({ type: 'mock', geom }))
  }))
}))
jest.mock('./vtTileFragments.js', () => ({
  renderFeatureToGeoJSON: jest.fn(f => ({ type: 'mock-vt', feature: f }))
}))

const makeMap = (hits = []) => ({
  forEachFeatureAtPixel: jest.fn((pixel, cb, opts) => {
    for (const [feature, layer] of hits) cb(feature, layer)
  })
})

const makeVTLayer = () => Object.assign(new VectorTileLayer(), { get: () => undefined })

const makeVTFeature = ({ id = undefined, styleLayerId = 'roads', type = 'fill', props = {} } = {}) => ({
  getId: () => id,
  get: (key) => {
    if (key === 'mapbox-layer') return { id: styleLayerId, type }
    return undefined
  },
  getProperties: () => ({ 'mapbox-layer': { id: styleLayerId }, ...props })
})

const makeVectorLayer = (layerId, isHighlight = false) => Object.assign(new VectorLayer(), {
  get: (key) => {
    if (key === 'layerId') return layerId
    if (key === '_highlight') return isHighlight || undefined
    return undefined
  }
})

const makeVectorFeature = (id = 'f1', geom = { type: 'Point' }, props = {}) => ({
  getId: () => id,
  getGeometry: () => geom,
  getProperties: () => props
})

describe('queryFeatures', () => {
  beforeEach(() => jest.clearAllMocks())

  /* ------------------------------------------------------------------ */
  /* Guard                                                               */
  /* ------------------------------------------------------------------ */

  it('returns empty array when point is null', () => {
    expect(queryFeatures(makeMap(), null)).toEqual([])
  })

  it('returns empty array when point is undefined', () => {
    expect(queryFeatures(makeMap())).toEqual([])
  })

  /* ------------------------------------------------------------------ */
  /* Options                                                             */
  /* ------------------------------------------------------------------ */

  it('passes point.x/y as pixel and radius as hitTolerance', () => {
    const map = makeMap()
    queryFeatures(map, { x: 20, y: 30 }, { radius: 5 })
    expect(map.forEachFeatureAtPixel).toHaveBeenCalledWith(
      [20, 30],
      expect.any(Function),
      { hitTolerance: 5 }
    )
  })

  it('defaults radius to 10', () => {
    const map = makeMap()
    queryFeatures(map, { x: 0, y: 0 })
    expect(map.forEachFeatureAtPixel).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Function),
      { hitTolerance: 10 }
    )
  })

  /* ------------------------------------------------------------------ */
  /* VectorTile layer features                                          */
  /* ------------------------------------------------------------------ */

  it('returns a result for a VT feature', () => {
    const feature = makeVTFeature({ id: 42, styleLayerId: 'roads' })
    const map = makeMap([[feature, makeVTLayer()]])
    const results = queryFeatures(map, { x: 0, y: 0 })
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ id: 42, layer: { id: 'roads' } })
    expect(renderFeatureToGeoJSON).toHaveBeenCalledWith(feature)
  })

  it('skips VT features with no mapbox-layer id', () => {
    const feature = { getId: () => 1, get: () => undefined, getProperties: () => ({}) }
    const map = makeMap([[feature, makeVTLayer()]])
    expect(queryFeatures(map, { x: 0, y: 0 })).toEqual([])
  })

  it('skips background-type VT features', () => {
    const feature = makeVTFeature({ type: 'background' })
    const map = makeMap([[feature, makeVTLayer()]])
    expect(queryFeatures(map, { x: 0, y: 0 })).toEqual([])
  })

  it('deduplicates VT features with the same styleLayerId and feature id', () => {
    const feature = makeVTFeature({ id: 1, styleLayerId: 'roads' })
    const map = makeMap([[feature, makeVTLayer()], [feature, makeVTLayer()]])
    expect(queryFeatures(map, { x: 0, y: 0 })).toHaveLength(1)
  })

  it('uses property hash as id when VT feature has no explicit id', () => {
    const feature = makeVTFeature({ id: undefined, styleLayerId: 'roads', props: { name: 'A' } })
    const map = makeMap([[feature, makeVTLayer()]])
    const results = queryFeatures(map, { x: 0, y: 0 })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBeUndefined()
  })

  it('deduplicates id-less VT features with identical properties', () => {
    const f1 = makeVTFeature({ id: undefined, styleLayerId: 'roads', props: { name: 'A' } })
    const f2 = makeVTFeature({ id: undefined, styleLayerId: 'roads', props: { name: 'A' } })
    const map = makeMap([[f1, makeVTLayer()], [f2, makeVTLayer()]])
    expect(queryFeatures(map, { x: 0, y: 0 })).toHaveLength(1)
  })

  /* ------------------------------------------------------------------ */
  /* Vector layer features                                              */
  /* ------------------------------------------------------------------ */

  it('returns a result for a Vector layer feature', () => {
    const feature = makeVectorFeature('f1', { type: 'Point' })
    const map = makeMap([[feature, makeVectorLayer('draw')]])
    const results = queryFeatures(map, { x: 0, y: 0 })
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ id: 'f1', layer: { id: 'draw' } })
  })

  it('skips Vector layer features with no layerId', () => {
    const feature = makeVectorFeature('f1')
    const map = makeMap([[feature, makeVectorLayer(undefined)]])
    expect(queryFeatures(map, { x: 0, y: 0 })).toEqual([])
  })

  it('skips highlight overlay Vector layers', () => {
    const feature = makeVectorFeature('f1')
    const map = makeMap([[feature, makeVectorLayer('draw', true)]])
    expect(queryFeatures(map, { x: 0, y: 0 })).toEqual([])
  })

  it('deduplicates Vector layer features with the same layerId and feature id', () => {
    const feature = makeVectorFeature('f1')
    const map = makeMap([[feature, makeVectorLayer('draw')], [feature, makeVectorLayer('draw')]])
    expect(queryFeatures(map, { x: 0, y: 0 })).toHaveLength(1)
  })

  /* ------------------------------------------------------------------ */
  /* Mixed / other layers                                               */
  /* ------------------------------------------------------------------ */

  it('skips features from other layer types', () => {
    const feature = makeVectorFeature('f1')
    const map = makeMap([[feature, {}]]) // plain object, not VectorTileLayer or VectorLayer
    expect(queryFeatures(map, { x: 0, y: 0 })).toEqual([])
  })

  it('returns results from both VT and Vector layers in one call', () => {
    const vtFeature = makeVTFeature({ id: 1, styleLayerId: 'roads' })
    const vecFeature = makeVectorFeature('f1')
    const map = makeMap([[vtFeature, makeVTLayer()], [vecFeature, makeVectorLayer('draw')]])
    expect(queryFeatures(map, { x: 0, y: 0 })).toHaveLength(2)
  })
})
