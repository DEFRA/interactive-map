import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import OlFeature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import Icon from 'ol/style/Icon.js'
import { updateHighlightedFeatures } from './highlightFeatures.js'
import { SymbolImageCache } from './symbolImages.js'

const HIGHLIGHT_MARKER = '_highlight'

// Mirrors the map interface this module actually calls: getLayers().forEach(...)/getArray()
// to find/enumerate real ol/layer instances, and addLayer() to register new ones. Layers
// passed in (or added during a test) are real ol/layer/Vector or ol/layer/VectorTile instances.
const createFakeMap = (layers = []) => {
  const list = [...layers]
  return {
    _layers: list,
    getLayers: () => ({ forEach: (cb) => list.forEach(cb), getArray: () => list }),
    addLayer: jest.fn((l) => list.push(l))
  }
}

const getHighlightLayer = (map) => map._layers.find(l => l.get(HIGHLIGHT_MARKER))

// features: [[id, properties]] — populates the layer's real VectorSource, since the module
// under test now reads a selected/active point's CURRENT properties straight off this live
// feature (not off whatever the caller's selectedFeatures/activeFeatures snapshot carries) —
// see getLiveProperties's own comment for why.
const drawLayer = (features = []) => {
  const source = new VectorSource()
  features.forEach(([id, properties]) => {
    const f = new OlFeature({ geometry: new Point([1, 2]), ...properties })
    f.setId(id)
    source.addFeature(f)
  })
  const layer = new VectorLayer({ source })
  layer.set('layerId', 'draw')
  layer.set('layerType', 'vector') // mirrors OLDrawManager.js's own tagging
  return layer
}

const selEntry = (id, geometry = { type: 'Point', coordinates: [1, 2] }) => ({ layerId: 'draw', featureId: id, geometry })

// The provider's own cache of rasterised symbol images, passed to updateHighlightedFeatures
let symbolImages
const addImage = (imageId, imageData) => {
  symbolImages.addImage(imageId, imageData)
  return symbolImages.getImage(imageId)
}

beforeEach(() => {
  symbolImages = new SymbolImageCache()
  // jsdom has no canvas encoding; registering a normal image makes its data URI
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock')
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    this._ctx ??= { putImageData: jest.fn() }
    return this._ctx
  })
})

describe('updateHighlightedFeatures', () => {
  test('returns null and does nothing when there is no map', () => {
    expect(updateHighlightedFeatures(null, [], [], {})).toBeNull()
  })

  test('creates the highlight overlay layer once and reuses it on later calls', () => {
    const map = createFakeMap([drawLayer()])
    updateHighlightedFeatures(map, [], [], {}, symbolImages)
    expect(map.addLayer).toHaveBeenCalledTimes(1)
    updateHighlightedFeatures(map, [], [], {}, symbolImages)
    expect(map.addLayer).toHaveBeenCalledTimes(1) // reused, not re-added
  })

  test('clears previous overlay features before adding the current selection', () => {
    const map = createFakeMap([drawLayer([['f1', {}]])])
    const stylesMap = { draw: { stroke: '#000', selectionStroke: '#000', fill: 'transparent', strokeWidth: 2, activeStrokeWidth: 2 } }
    updateHighlightedFeatures(map, [{ ...selEntry('f1'), geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }], [], stylesMap, symbolImages)
    expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(1)
    updateHighlightedFeatures(map, [], [], stylesMap, symbolImages)
    expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
  })

  test('a feature with no geometry is skipped', () => {
    const map = createFakeMap([drawLayer()])
    const stylesMap = { draw: { stroke: '#000', selectionStroke: '#000', fill: 'transparent', strokeWidth: 2, activeStrokeWidth: 2 } }
    updateHighlightedFeatures(map, [{ layerId: 'draw' }], [], stylesMap, symbolImages)
    expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
  })

  test('a feature whose layerId has no stylesMap entry and no symbol properties renders nothing', () => {
    const map = createFakeMap([drawLayer([['f1', {}]])])
    updateHighlightedFeatures(map, [{ ...selEntry('f1'), geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }], [], {}, symbolImages)
    expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
  })

  test('plain (non-symbol) Polygon/LineString selection still styles via Stroke/Fill, unaffected by the symbol path', () => {
    const map = createFakeMap([drawLayer([['f1', {}]])])
    const stylesMap = { draw: { stroke: '#000', selectionStroke: '#111', fill: '#222', strokeWidth: 3, activeStrokeWidth: 5 } }
    const feature = { ...selEntry('f1'), geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }
    updateHighlightedFeatures(map, [feature], [], stylesMap, symbolImages)
    const [hlFeature] = getHighlightLayer(map).getSource().getFeatures()
    const styles = hlFeature.getStyle()
    expect(styles.some(s => s.getFill())).toBe(true) // selected polygons get a fill
    expect(styles.every(s => !s.getImage())).toBe(true) // no Icon involved
  })

  describe('symbol-styled points (draw)', () => {
    const symbolProperties = (variantImageId, imageId = 'sym-normal') => ({
      symbol: 'pin',
      symbolImageId: imageId,
      symbolSelectedImageId: variantImageId,
      symbolActiveImageId: variantImageId,
      symbolImageAnchor: [0.5, 1],
      symbolPixelRatio: 2
    })

    test('renders the selected-variant Icon for a selected symbol point, scaled down by symbolPixelRatio', () => {
      const canvas = addImage('sym-sel', { width: 88, height: 88 })
      const map = createFakeMap([drawLayer([['f1', symbolProperties('sym-sel')]])])
      updateHighlightedFeatures(map, [selEntry('f1')], [], {}, symbolImages)
      const [hlFeature] = getHighlightLayer(map).getSource().getFeatures()
      const [style] = hlFeature.getStyle()
      expect(style.getImage()).toBeInstanceOf(Icon)
      expect(style.getImage().getImage(1)).toBe(canvas)
      expect(style.getImage().getScale()).toBe(0.5) // 1 / symbolPixelRatio (2)
    })

    test('renders the active-variant Icon for the keyboard-cursor item', () => {
      const canvas = addImage('sym-act', { width: 44, height: 44 })
      const map = createFakeMap([drawLayer([['f1', symbolProperties('sym-act')]])])
      updateHighlightedFeatures(map, [], [selEntry('f1')], {}, symbolImages)
      const [hlFeature] = getHighlightLayer(map).getSource().getFeatures()
      const [style] = hlFeature.getStyle()
      expect(style.getImage().getImage(1)).toBe(canvas)
    })

    // The whole point of reading live properties instead of trusting selectedFeatures'
    // captured-at-selection-time snapshot: a map style change re-resolves the point's
    // variants (point/pointSymbolImages.js) and rewrites them onto the live feature — the
    // highlight must pick up the NEW id, not whatever was true when the user first selected.
    test('picks up a re-resolved symbolSelectedImageId after a map style change, not whatever was true at selection time', () => {
      const canvasLight = addImage('sym-sel-light', { width: 44, height: 44 })
      const canvasDark = addImage('sym-sel-dark', { width: 44, height: 44 })
      const layer = drawLayer([['f1', symbolProperties('sym-sel-light')]])
      const map = createFakeMap([layer])

      updateHighlightedFeatures(map, [selEntry('f1')], [], {}, symbolImages)
      const before = getHighlightLayer(map).getSource().getFeatures()[0].getStyle()[0]
      expect(before.getImage().getImage(1)).toBe(canvasLight)

      // Simulate refreshAllPointSymbols re-resolving the point against a new map style.
      layer.getSource().getFeatureById('f1').set('symbolSelectedImageId', 'sym-sel-dark')
      updateHighlightedFeatures(map, [selEntry('f1')], [], {}, symbolImages)
      const after = getHighlightLayer(map).getSource().getFeatures()[0].getStyle()[0]
      expect(after.getImage().getImage(1)).toBe(canvasDark)
    })

    test('falls back to no highlight (not a crash) when the variant has not been cached yet', () => {
      const map = createFakeMap([drawLayer([['f1', symbolProperties('sym-not-cached')]])])
      updateHighlightedFeatures(map, [selEntry('f1')], [], {}, symbolImages)
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })

    test('uses the anchor draw resolved for the point', () => {
      addImage('sym-sel', { width: 44, height: 44 })
      const map = createFakeMap([drawLayer([['f1', { ...symbolProperties('sym-sel'), symbolImageAnchor: [0.25, 0.75] }]])])
      updateHighlightedFeatures(map, [selEntry('f1')], [], {}, symbolImages)
      const [style] = getHighlightLayer(map).getSource().getFeatures()[0].getStyle()
      expect(style.getImage().getAnchor()).toEqual([11, 33]) // [0.25, 0.75] × 44px
    })

    test('falls back to no highlight until the point\'s anchor has been resolved', () => {
      addImage('sym-sel', { width: 44, height: 44 })
      const { symbolImageAnchor, ...unresolved } = symbolProperties('sym-sel')
      const map = createFakeMap([drawLayer([['f1', unresolved]])])
      updateHighlightedFeatures(map, [selEntry('f1')], [], {}, symbolImages)
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })

    test('falls back to no highlight when the live feature cannot be found (e.g. deleted mid-flight)', () => {
      const map = createFakeMap([drawLayer()]) // empty source — 'f1' doesn't exist
      updateHighlightedFeatures(map, [selEntry('f1')], [], {}, symbolImages)
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })

    test('a plain Point with no symbol config falls through to Stroke/Fill (still no visible highlight)', () => {
      const map = createFakeMap([drawLayer([['f1', {}]])])
      updateHighlightedFeatures(map, [selEntry('f1')], [], {}, symbolImages)
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })
  })

  describe('symbol-styled points (dataset)', () => {
    const LAYER_ID = 'historic-monuments-prehistoric'

    // A dataset symbol point has no symbolSelectedImageId/symbolActiveImageId of its own (see
    // symbolProperties above) — the layer itself is tagged with the one base imageId every
    // feature shares instead (see layerBuilders.js's createDatasetLayer / OpenLayersDataset.
    // symbolMeta), and the variant is resolved from that via symbolImages.js's reverse-map.
    const datasetSymbolLayer = (features, symbolMeta) => {
      const source = new VectorSource()
      features.forEach(([id, properties]) => {
        const f = new OlFeature({ geometry: new Point([1, 2]), ...properties })
        f.setId(id)
        source.addFeature(f)
      })
      const layer = new VectorLayer({ source })
      layer.set('layerId', LAYER_ID)
      layer.set('layerType', 'vector')
      if (symbolMeta) {
        layer.set('symbolMeta', symbolMeta)
      }
      return layer
    }

    const registerDatasetSymbol = async () => {
      const symbolRegistry = {
        getSymbolImageId: jest.fn((style, mapStyle, variant) => `ds-symbol-${variant}`),
        rasteriseSymbolImage: jest.fn(async (style, mapStyle, variant) => ({
          imageId: `ds-symbol-${variant}`,
          imageData: { width: 30, height: 30 }
        }))
      }
      await symbolImages.registerSymbol({ symbol: 'square' }, {}, symbolRegistry, 3)
    }

    test('renders the selected-variant Icon for a dataset symbol point', async () => {
      await registerDatasetSymbol()
      const selectedCanvas = symbolImages.getImage('ds-symbol-selected')
      const map = createFakeMap([datasetSymbolLayer([['f1', {}]], { imageId: 'ds-symbol-normal', anchor: [0.5, 1], pixelRatio: 3 })])

      updateHighlightedFeatures(map, [{ layerId: LAYER_ID, featureId: 'f1', geometry: { type: 'Point', coordinates: [1, 2] } }], [], {}, symbolImages)
      const [hlFeature] = getHighlightLayer(map).getSource().getFeatures()
      const [style] = hlFeature.getStyle()
      expect(style.getImage()).toBeInstanceOf(Icon)
      expect(style.getImage().getImage(1)).toBe(selectedCanvas)
      // drawn 1:1 — scaled by the pixelRatio the image was rasterised at
      expect(style.getImage().getScale()).toBeCloseTo(1 / 3)
    })

    test('renders the active-variant Icon for the keyboard-cursor item', async () => {
      await registerDatasetSymbol()
      const activeCanvas = symbolImages.getImage('ds-symbol-active')
      const map = createFakeMap([datasetSymbolLayer([['f1', {}]], { imageId: 'ds-symbol-normal', anchor: [0.5, 1], pixelRatio: 3 })])

      updateHighlightedFeatures(map, [], [{ layerId: LAYER_ID, featureId: 'f1', geometry: { type: 'Point', coordinates: [1, 2] } }], {}, symbolImages)
      const [hlFeature] = getHighlightLayer(map).getSource().getFeatures()
      const [style] = hlFeature.getStyle()
      expect(style.getImage().getImage(1)).toBe(activeCanvas)
    })

    test('falls back to no highlight when no symbol image cache is given', async () => {
      await registerDatasetSymbol()
      const map = createFakeMap([datasetSymbolLayer([['f1', {}]], { imageId: 'ds-symbol-normal', anchor: [0.5, 1], pixelRatio: 3 })])
      updateHighlightedFeatures(map, [{ layerId: LAYER_ID, featureId: 'f1', geometry: { type: 'Point', coordinates: [1, 2] } }], [], {})
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })

    test('falls back to no highlight when the layer has no symbolMeta (not a symbol dataset)', () => {
      const map = createFakeMap([datasetSymbolLayer([['f1', {}]])])
      updateHighlightedFeatures(map, [{ layerId: LAYER_ID, featureId: 'f1', geometry: { type: 'Point', coordinates: [1, 2] } }], [], {}, symbolImages)
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })

    test('falls back to no highlight when the variant has not been rasterised/cached yet', () => {
      const map = createFakeMap([datasetSymbolLayer([['f1', {}]], { imageId: 'ds-symbol-never-registered', anchor: [0.5, 1] })])
      updateHighlightedFeatures(map, [{ layerId: LAYER_ID, featureId: 'f1', geometry: { type: 'Point', coordinates: [1, 2] } }], [], {}, symbolImages)
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })
  })
})

describe('VectorTileLayer style-wrap', () => {
  test('does not throw when a VT layer is present alongside a draw VectorLayer', () => {
    const vt = new VectorTileLayer({})
    vt.set('layerType', 'vectorTile')
    const map = createFakeMap([vt, drawLayer()])
    expect(() => updateHighlightedFeatures(map, [], [], {}, symbolImages)).not.toThrow()
  })

  const vtStylesMap = { 'existing-fields': { stroke: '#000', selectionStroke: '#111', fill: 'transparent', strokeWidth: 2, activeStrokeWidth: 2 } }

  // Two different vector-tile producers share the 'vectorTile' layerType tag: draw-ol's
  // basemap MVT tiles (a 'mapbox-layer' object per feature) and the datasets plugin's own
  // tiles-backed datasets (no 'mapbox-layer' at all — the id lives on the OL layer itself, as
  // 'layerId'). This feature has neither a mapbox-layer property nor any live 'get' beyond the
  // default, matching a real datasets-plugin MVT feature.
  const datasetVtFeature = (id) => {
    const feature = new OlFeature({ geometry: new Point([1, 2]) })
    feature.setId(id)
    return feature
  }

  test('highlights a datasets-plugin tiles-backed feature via the layer\'s own layerId', () => {
    const vt = new VectorTileLayer({ style: { 'fill-color': '#0000ff' } })
    vt.set('layerType', 'vectorTile')
    vt.set('layerId', 'existing-fields')
    const map = createFakeMap([vt])
    const feature = datasetVtFeature('f1')

    updateHighlightedFeatures(map, [{ layerId: 'existing-fields', featureId: 'f1', geometry: { type: 'Point', coordinates: [1, 2] } }], [], vtStylesMap, symbolImages)

    const styles = vt.getStyle()(feature, 1)
    expect(Array.isArray(styles)).toBe(true)
    expect(styles.some(s => s.getStroke()?.getColor() === '#111')).toBe(true) // selectionStroke applied
  })

  test('leaves a non-matching datasets-plugin tiles-backed feature unhighlighted', () => {
    const vt = new VectorTileLayer({ style: { 'fill-color': '#0000ff' } })
    vt.set('layerType', 'vectorTile')
    vt.set('layerId', 'existing-fields')
    const map = createFakeMap([vt])
    const feature = datasetVtFeature('f2') // not the selected f1

    updateHighlightedFeatures(map, [{ layerId: 'existing-fields', featureId: 'f1', geometry: { type: 'Point', coordinates: [1, 2] } }], [], vtStylesMap, symbolImages)

    const base = vt._highlightOriginalStyle(feature, 1)
    const styled = vt.getStyle()(feature, 1)
    expect(styled).toEqual(base)
  })

  test('picks up a restyle made while a selection stays active, instead of wrapping a stale pre-restyle style forever', () => {
    // Simulates a map style/theme switch: _setLayerStyle calls layer.setStyle(...) directly on
    // a dataset layer while a feature on it is still selected (e.g. via useHighlightSync's
    // re-apply after MAP_STYLE_CHANGE) — the highlight wrap must notice its own wrap was
    // replaced and re-capture the new live style, not keep calling the old one underneath.
    const vt = new VectorTileLayer({ style: { 'fill-color': '#0000ff' } })
    vt.set('layerType', 'vectorTile')
    vt.set('layerId', 'existing-fields')
    const map = createFakeMap([vt])
    const selection = [{ layerId: 'existing-fields', featureId: 'f1', geometry: { type: 'Point', coordinates: [1, 2] } }]

    updateHighlightedFeatures(map, selection, [], vtStylesMap, symbolImages)

    // Something outside the highlight module (a theme switch) restyles the layer directly.
    vt.setStyle({ 'fill-color': '#ff0000' })

    updateHighlightedFeatures(map, selection, [], vtStylesMap, symbolImages)

    const otherFeature = datasetVtFeature('not-selected')
    const [styled] = vt.getStyle()(otherFeature, 1)
    expect(styled.getFill().getColor()).toEqual([255, 0, 0, 1])
  })

  test('restores the original style function once nothing is selected/active', () => {
    const vt = new VectorTileLayer({ style: { 'fill-color': '#0000ff' } })
    vt.set('layerType', 'vectorTile')
    vt.set('layerId', 'existing-fields')
    const map = createFakeMap([vt])

    updateHighlightedFeatures(map, [{ layerId: 'existing-fields', featureId: 'f1', geometry: { type: 'Point', coordinates: [1, 2] } }], [], vtStylesMap, symbolImages)
    expect(vt._highlightOriginalStyle).toBeDefined()

    updateHighlightedFeatures(map, [], [], vtStylesMap, symbolImages)
    expect(vt._highlightOriginalStyle).toBeUndefined()
  })
})
