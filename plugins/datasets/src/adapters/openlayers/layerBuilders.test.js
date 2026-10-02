import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import { createDatasetSource, createDatasetLayer, readGeoJSONFeatures } from './layerBuilders.js'
import { logger } from '../../../../../src/services/logger.js'

jest.mock('../../../../../src/services/logger.js', () => ({ logger: { warn: jest.fn() } }))

const point = (id, coords, properties = {}) => ({
  type: 'Feature', id, properties, geometry: { type: 'Point', coordinates: coords }
})

describe('readGeoJSONFeatures', () => {
  it('reads features using their native id when no idProperty is given', () => {
    const geojson = { type: 'FeatureCollection', features: [point(1, [0, 0])] }
    const [feature] = readGeoJSONFeatures(geojson, null)
    expect(feature.getId()).toBe(1)
  })

  it('promotes idProperty onto the feature id when given', () => {
    const geojson = { type: 'FeatureCollection', features: [point('native-1', [0, 0], { ref: 'abc' })] }
    const [feature] = readGeoJSONFeatures(geojson, 'ref')
    expect(feature.getId()).toBe('abc')
  })
})

describe('createDatasetSource', () => {
  it('returns null when the dataset has no source', () => {
    expect(createDatasetSource({ id: 'ds', source: null })).toBeNull()
  })

  it('builds a populated VectorSource for a geojson dataset', () => {
    const registryDataset = {
      id: 'ds',
      idStrategy: null,
      source: { type: 'geojson', data: { type: 'FeatureCollection', features: [point(1, [0, 0])] } }
    }
    const source = createDatasetSource(registryDataset)
    expect(source).toBeInstanceOf(VectorSource)
    expect(source.getFeatures()).toHaveLength(1)
  })

  it('builds an empty VectorSource for a geojson dataset with no features', () => {
    const registryDataset = { id: 'ds', idStrategy: null, source: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } }
    const source = createDatasetSource(registryDataset)
    expect(source.getFeatures()).toHaveLength(0)
  })

  describe('vector tile source', () => {
    it('builds a VectorTileSource for a tiles array', () => {
      const registryDataset = { id: 'ds-tiles', idStrategy: null, source: { type: 'vector', tiles: ['https://example.com/{z}/{x}/{y}'] } }
      const source = createDatasetSource(registryDataset)
      expect(source).toBeInstanceOf(VectorTileSource)
      expect(source.getUrls()).toEqual(['https://example.com/{z}/{x}/{y}'])
    })

    it('normalises a single tiles URL string into an array', () => {
      const registryDataset = { id: 'ds-tiles', idStrategy: null, source: { type: 'vector', tiles: 'https://example.com/{z}/{x}/{y}' } }
      const source = createDatasetSource(registryDataset)
      expect(source.getUrls()).toEqual(['https://example.com/{z}/{x}/{y}'])
    })

    it('uses the fixed BNG tile grid, not the default Web Mercator one', () => {
      const registryDataset = { id: 'ds-tiles', idStrategy: null, source: { type: 'vector', tiles: ['https://example.com/{z}/{x}/{y}'] } }
      const source = createDatasetSource(registryDataset)
      const tileGrid = source.getTileGrid()
      expect(tileGrid.getExtent()).toEqual([0, 0, 1300000, 1300000])
      expect(tileGrid.getOrigin(0)).toEqual([0, 1300000])
      expect(tileGrid.getTileSize(0)).toBe(256)
    })
  })

  it('warns and returns null for an unsupported source type', () => {
    const registryDataset = { id: 'ds-unsupported', source: { type: 'raster' } }
    expect(createDatasetSource(registryDataset)).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ds-unsupported'))
  })

  describe('geojson as a URL string', () => {
    const flushMicrotasks = () => Promise.resolve().then(() => Promise.resolve())

    beforeEach(() => {
      global.fetch = jest.fn()
    })

    it('returns an empty source immediately, then populates it once the fetch resolves', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [point(1, [0, 0])] })
      })
      const registryDataset = { id: 'ds', idStrategy: null, source: { type: 'geojson', data: 'https://example.com/data.geojson' } }

      const source = createDatasetSource(registryDataset)
      expect(source.getFeatures()).toHaveLength(0)

      await flushMicrotasks()
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/data.geojson')
      expect(source.getFeatures()).toHaveLength(1)
    })

    it('promotes idStrategy onto fetched features', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [point('native', [0, 0], { ref: 'abc' })] })
      })
      const registryDataset = { id: 'ds', idStrategy: 'ref', source: { type: 'geojson', data: 'https://example.com/data.geojson' } }

      const source = createDatasetSource(registryDataset)
      await flushMicrotasks()

      expect(source.getFeatures()[0].getId()).toBe('abc')
    })

    it('warns and leaves the source empty when the fetch response is not ok', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })
      const registryDataset = { id: 'ds-404', idStrategy: null, source: { type: 'geojson', data: 'https://example.com/missing.geojson' } }

      const source = createDatasetSource(registryDataset)
      await flushMicrotasks()

      expect(source.getFeatures()).toHaveLength(0)
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ds-404'))
    })

    it('warns when the fetch itself rejects', async () => {
      global.fetch.mockRejectedValue(new Error('network down'))
      const registryDataset = { id: 'ds-fail', idStrategy: null, source: { type: 'geojson', data: 'https://example.com/data.geojson' } }

      createDatasetSource(registryDataset)
      await flushMicrotasks()

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ds-fail'))
    })
  })
})

describe('createDatasetLayer', () => {
  // Hex, not a named colour ('blue') — ol/style/flat resolves named CSS colours via a real
  // canvas 2D context, which jsdom returns null for without the `canvas` npm package. Hex
  // colours take OL's fast lane and skip that path entirely (see ol/color.js#parseRgba).
  // Named colours work fine in a real browser; this is a test-environment gap only.
  const registryDataset = { getFlatStyle: () => ({ 'fill-color': '#0000ff' }), opacity: 0.5, visibility: 'visible', minZoom: 1, maxZoom: 10, hasPattern: false }

  it('builds a Canvas VectorLayer', () => {
    const layer = createDatasetLayer(registryDataset, new VectorSource())
    expect(layer).toBeInstanceOf(VectorLayer)
    expect(layer.getOpacity()).toBe(0.5)
    expect(layer.getVisible()).toBe(true)
  })

  it('sets visible to false when the dataset visibility is "none"', () => {
    const layer = createDatasetLayer({ ...registryDataset, visibility: 'none' }, new VectorSource())
    expect(layer.getVisible()).toBe(false)
  })

  it('tags the layer with layerType and layerId so the OL provider\'s queryFeatures recognises it', () => {
    const layer = createDatasetLayer({ ...registryDataset, id: 'my-dataset' }, new VectorSource())
    expect(layer.get('layerType')).toBe('vector')
    expect(layer.get('layerId')).toBe('my-dataset')
  })

  describe('minZoom/maxZoom semantics', () => {
    // OL's own visibility check (ol/layer/Layer.js) is `zoom > minZoom && zoom <= maxZoom` —
    // exclusive-min, inclusive-max. MapLibre/the Mapbox style spec is the opposite:
    // inclusive-min, exclusive-max (`zoom >= minzoom && zoom < maxzoom`). Without compensating,
    // a dataset's minZoom:6 (matching this app's own shared default) would incorrectly hide at
    // exactly zoom 6 in OL, when MapLibre would still show it there.
    const isVisibleAtZoom = (layer, zoom) => zoom > layer.getMinZoom() && zoom <= layer.getMaxZoom()

    it('shows the layer AT its minZoom, matching MapLibre\'s inclusive-min (not OL\'s native exclusive-min)', () => {
      const layer = createDatasetLayer({ ...registryDataset, minZoom: 6, maxZoom: 20 }, new VectorSource())
      expect(isVisibleAtZoom(layer, 6)).toBe(true)
    })

    it('hides the layer AT its maxZoom, matching MapLibre\'s exclusive-max (not OL\'s native inclusive-max)', () => {
      const layer = createDatasetLayer({ ...registryDataset, minZoom: 6, maxZoom: 20 }, new VectorSource())
      expect(isVisibleAtZoom(layer, 20)).toBe(false)
    })

    it('still shows the layer comfortably within its zoom range', () => {
      const layer = createDatasetLayer({ ...registryDataset, minZoom: 6, maxZoom: 20 }, new VectorSource())
      expect(isVisibleAtZoom(layer, 12)).toBe(true)
    })

    it('still hides the layer comfortably outside its zoom range', () => {
      const layer = createDatasetLayer({ ...registryDataset, minZoom: 6, maxZoom: 20 }, new VectorSource())
      expect(isVisibleAtZoom(layer, 5)).toBe(false)
      expect(isVisibleAtZoom(layer, 21)).toBe(false)
    })

    it('leaves unrestricted (undefined) zoom bounds alone', () => {
      const layer = createDatasetLayer({ ...registryDataset, minZoom: undefined, maxZoom: undefined }, new VectorSource())
      expect(layer.getMinZoom()).toBe(-Infinity)
      expect(layer.getMaxZoom()).toBe(Infinity)
    })
  })

  describe('z-ordering', () => {
    it('gives a fill/stroke dataset the default zIndex', () => {
      const layer = createDatasetLayer(registryDataset, new VectorSource())
      expect(layer.getZIndex()).toBe(0)
    })

    it('gives a symbol dataset a higher zIndex, so it always renders above fill/stroke layers', () => {
      const layer = createDatasetLayer({ ...registryDataset, hasSymbol: true, getSymbolMeta: () => null }, new VectorSource())
      expect(layer.getZIndex()).toBeGreaterThan(0)
    })

    it('tags a symbol layer with its symbolMeta at the context pixelRatio, for highlightFeatures.js', () => {
      const getSymbolMeta = jest.fn((pixelRatio) => ({ imageId: 'img', anchor: [0.5, 0.5], pixelRatio }))
      const layer = createDatasetLayer({ ...registryDataset, hasSymbol: true, getSymbolMeta }, new VectorSource(), { pixelRatio: 3 })
      expect(layer.get('symbolMeta')).toEqual({ imageId: 'img', anchor: [0.5, 0.5], pixelRatio: 3 })
    })
  })

  describe('tile-backed dataset', () => {
    const tileRegistryDataset = { getFlatStyle: () => ({ 'stroke-color': '#0000ff' }), opacity: 1, visibility: 'visible', hasPattern: false, id: 'existing-fields' }
    // A real VectorTileSource, built the same way createDatasetSource does — a bare
    // `new VectorTileSource()` throws without a resolved projection.
    const tileSource = () => createDatasetSource({ id: 'existing-fields', idStrategy: null, source: { type: 'vector', tiles: ['https://example.com/{z}/{x}/{y}'] } })

    it('builds a Canvas VectorTileLayer for a VectorTileSource', () => {
      const layer = createDatasetLayer(tileRegistryDataset, tileSource())
      expect(layer).toBeInstanceOf(VectorTileLayer)
    })

    it('renders true vector geometry every frame, not the hybrid raster-tile default', () => {
      const layer = createDatasetLayer(tileRegistryDataset, tileSource())
      expect(layer.getRenderMode()).toBe('vector')
    })

    it('tags a tile-backed layer as layerType "vectorTile", not "vector"', () => {
      const layer = createDatasetLayer(tileRegistryDataset, tileSource())
      expect(layer.get('layerType')).toBe('vectorTile')
      expect(layer.get('layerId')).toBe('existing-fields')
    })
  })
})
