import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import OlFeature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import Icon from 'ol/style/Icon.js'
import { updateHighlightedFeatures } from './highlightFeatures.js'
import { getOrCreateSymbolImage, clearSymbolImageCache } from './symbolImages.js'

const HIGHLIGHT_MARKER = '_highlight'

// Mirrors the map interface this module actually calls: getLayers().forEach(...) to find/
// enumerate real ol/layer instances, and addLayer() to register new ones. Layers passed in
// (or added during a test) are real ol/layer/Vector or ol/layer/VectorTile instances, same as
// the rest of this codebase's OL tests use real ol classes over mocks for anything the
// module under test actually instantiates or type-checks (instanceof).
const createFakeMap = (layers = []) => {
  const list = [...layers]
  return {
    _layers: list,
    getLayers: () => ({ forEach: (cb) => list.forEach(cb) }),
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
  return layer
}

const selEntry = (id, geometry = { type: 'Point', coordinates: [1, 2] }) => ({ layerId: 'draw', featureId: id, geometry })

beforeEach(() => {
  clearSymbolImageCache()
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
    updateHighlightedFeatures(map, [], [], {})
    expect(map.addLayer).toHaveBeenCalledTimes(1)
    updateHighlightedFeatures(map, [], [], {})
    expect(map.addLayer).toHaveBeenCalledTimes(1) // reused, not re-added
  })

  test('clears previous overlay features before adding the current selection', () => {
    const map = createFakeMap([drawLayer([['f1', {}]])])
    const stylesMap = { draw: { stroke: '#000', selectionStroke: '#000', fill: 'transparent', strokeWidth: 2, activeStrokeWidth: 2 } }
    updateHighlightedFeatures(map, [{ ...selEntry('f1'), geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }], [], stylesMap)
    expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(1)
    updateHighlightedFeatures(map, [], [], stylesMap)
    expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
  })

  test('a feature with no geometry is skipped', () => {
    const map = createFakeMap([drawLayer()])
    const stylesMap = { draw: { stroke: '#000', selectionStroke: '#000', fill: 'transparent', strokeWidth: 2, activeStrokeWidth: 2 } }
    updateHighlightedFeatures(map, [{ layerId: 'draw' }], [], stylesMap)
    expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
  })

  test('a feature whose layerId has no stylesMap entry and no symbol properties renders nothing', () => {
    const map = createFakeMap([drawLayer([['f1', {}]])])
    updateHighlightedFeatures(map, [{ ...selEntry('f1'), geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }], [], {})
    expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
  })

  test('plain (non-symbol) Polygon/LineString selection still styles via Stroke/Fill, unaffected by the symbol path', () => {
    const map = createFakeMap([drawLayer([['f1', {}]])])
    const stylesMap = { draw: { stroke: '#000', selectionStroke: '#111', fill: '#222', strokeWidth: 3, activeStrokeWidth: 5 } }
    const feature = { ...selEntry('f1'), geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }
    updateHighlightedFeatures(map, [feature], [], stylesMap)
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
      symbolPixelRatio: 2
    })

    test('renders the selected-variant Icon for a selected symbol point, scaled down by symbolPixelRatio', () => {
      const canvas = getOrCreateSymbolImage('sym-sel', { width: 88, height: 88 })
      const map = createFakeMap([drawLayer([['f1', symbolProperties('sym-sel')]])])
      updateHighlightedFeatures(map, [selEntry('f1')], [], {})
      const [hlFeature] = getHighlightLayer(map).getSource().getFeatures()
      const [style] = hlFeature.getStyle()
      expect(style.getImage()).toBeInstanceOf(Icon)
      expect(style.getImage().getImage(1)).toBe(canvas)
      expect(style.getImage().getScale()).toBe(0.5) // 1 / symbolPixelRatio (2)
    })

    test('renders the active-variant Icon for the keyboard-cursor item', () => {
      const canvas = getOrCreateSymbolImage('sym-act', { width: 44, height: 44 })
      const map = createFakeMap([drawLayer([['f1', symbolProperties('sym-act')]])])
      updateHighlightedFeatures(map, [], [selEntry('f1')], {})
      const [hlFeature] = getHighlightLayer(map).getSource().getFeatures()
      const [style] = hlFeature.getStyle()
      expect(style.getImage().getImage(1)).toBe(canvas)
    })

    // The whole point of reading live properties instead of trusting selectedFeatures'
    // captured-at-selection-time snapshot: a map style change re-resolves the point's
    // variants (point/pointSymbolImages.js) and rewrites them onto the live feature — the
    // highlight must pick up the NEW id, not whatever was true when the user first selected.
    test('picks up a re-resolved symbolSelectedImageId after a map style change, not whatever was true at selection time', () => {
      const canvasLight = getOrCreateSymbolImage('sym-sel-light', { width: 44, height: 44 })
      const canvasDark = getOrCreateSymbolImage('sym-sel-dark', { width: 44, height: 44 })
      const layer = drawLayer([['f1', symbolProperties('sym-sel-light')]])
      const map = createFakeMap([layer])

      updateHighlightedFeatures(map, [selEntry('f1')], [], {})
      const before = getHighlightLayer(map).getSource().getFeatures()[0].getStyle()[0]
      expect(before.getImage().getImage(1)).toBe(canvasLight)

      // Simulate refreshAllPointSymbols re-resolving the point against a new map style.
      layer.getSource().getFeatureById('f1').set('symbolSelectedImageId', 'sym-sel-dark')
      updateHighlightedFeatures(map, [selEntry('f1')], [], {})
      const after = getHighlightLayer(map).getSource().getFeatures()[0].getStyle()[0]
      expect(after.getImage().getImage(1)).toBe(canvasDark)
    })

    test('falls back to no highlight (not a crash) when the variant has not been cached yet', () => {
      const map = createFakeMap([drawLayer([['f1', symbolProperties('sym-not-cached')]])])
      updateHighlightedFeatures(map, [selEntry('f1')], [], {})
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })

    test('falls back to no highlight when the live feature cannot be found (e.g. deleted mid-flight)', () => {
      const map = createFakeMap([drawLayer()]) // empty source — 'f1' doesn't exist
      updateHighlightedFeatures(map, [selEntry('f1')], [], {})
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })

    test('a plain Point with no symbol config falls through to Stroke/Fill (still no visible highlight)', () => {
      const map = createFakeMap([drawLayer([['f1', {}]])])
      updateHighlightedFeatures(map, [selEntry('f1')], [], {})
      expect(getHighlightLayer(map).getSource().getFeatures()).toHaveLength(0)
    })
  })
})

describe('VectorTileLayer style-wrap (smoke test — pre-existing, undocumented path)', () => {
  test('does not throw when a VT layer is present alongside a draw VectorLayer', () => {
    const vt = new VectorTileLayer({})
    const map = createFakeMap([vt, drawLayer()])
    expect(() => updateHighlightedFeatures(map, [], [], {})).not.toThrow()
  })
})
