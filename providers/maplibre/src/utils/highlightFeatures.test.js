import { updateHighlightedFeatures } from './highlightFeatures.js'

class LngLatBounds {
  constructor () { this.coords = [] }
  extend (c) { this.coords.push(c) }
  getWest () { return Math.min(...this.coords.map(c => c[0])) }
  getSouth () { return Math.min(...this.coords.map(c => c[1])) }
  getEast () { return Math.max(...this.coords.map(c => c[0])) }
  getNorth () { return Math.max(...this.coords.map(c => c[1])) }
}

const SYMBOL_IMAGE = 'symbol-abc123'
const EMPTY_FILTER = ['==', 'id', '']
const LINE_COLOR = 'line-color'
const STALE_SYMBOL_LAYER = 'active-highlight-stale-symbol'
const SEL_STALE_SYMBOL_LAYER = 'selected-highlight-stale-symbol'

const makeMap = (overrides = {}) => ({
  _activehighlightSources: new Set(),
  _selectedhighlightSources: new Set(),
  getLayer: jest.fn(),
  addLayer: jest.fn(),
  moveLayer: jest.fn(),
  setFilter: jest.fn(),
  setPaintProperty: jest.fn(),
  setLayoutProperty: jest.fn(),
  getLayoutProperty: jest.fn(),
  queryRenderedFeatures: jest.fn().mockReturnValue([]),
  ...overrides
})

// ─── Active (cursor) features — active-highlight-* layers ────────────────────

describe('Highlighting Utils — active (cursor) fill and line', () => {
  let map

  const ALL_BRANCHES_FEATURES = [
    { featureId: 1, layerId: 'l1', geometry: { type: 'Polygon' } },
    { featureId: 2, layerId: 'l1', geometry: { type: 'MultiPolygon' } },
    { featureId: 3, layerId: 'invalid' },
    { featureId: 4, layerId: 'l2', idProperty: 'customId', geometry: { type: 'Point' } }
  ]

  const ALL_BRANCHES_STYLES = { l1: { stroke: 'red', fill: 'blue' }, l2: { stroke: 'green' } }

  beforeEach(() => {
    map = makeMap({ _activehighlightSources: new Set(['stale']) })
  })

  test('All branches', () => {
    expect(updateHighlightedFeatures({ map: null })).toBeNull()

    map.getLayer.mockImplementation((id) => { // NOSONAR
      if (id.includes('stale')) { return {} }
      if (id === 'l1') { return { source: 's1', type: 'fill' } }
      if (id === 'l2') { return { source: 's2', type: 'line' } }
      if (id === 'active-highlight-l2-fill') { return {} }
      return null
    })

    updateHighlightedFeatures({ LngLatBounds, map, activeFeatures: ALL_BRANCHES_FEATURES, stylesMap: ALL_BRANCHES_STYLES })

    expect(map.setFilter).toHaveBeenCalledWith('active-highlight-stale-fill', EMPTY_FILTER)
    expect(map.setFilter).toHaveBeenCalledWith(STALE_SYMBOL_LAYER, EMPTY_FILTER)
    expect(map.setFilter).toHaveBeenCalledWith('active-highlight-l2-fill', EMPTY_FILTER)
    expect(map.setFilter).toHaveBeenCalledWith('active-highlight-l2-line', expect.arrayContaining([['get', 'customId']]))
  })

  test('null _activehighlightSources falls back to empty set; line geom skips absent fill layer', () => {
    map._activehighlightSources = null
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR
    updateHighlightedFeatures({ LngLatBounds, map, activeFeatures: [{ featureId: 1, layerId: 'l1' }], stylesMap: { l1: { stroke: 'red' } } })
    expect(map.setFilter).not.toHaveBeenCalledWith('active-highlight-l1-fill', expect.anything())
  })

  test('persistent layer skips cleanup; missing stale layers skip setFilter', () => {
    map._activehighlightSources = new Set(['stale', 'l1'])
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR
    updateHighlightedFeatures({ LngLatBounds, map, activeFeatures: [{ featureId: 1, layerId: 'l1' }], stylesMap: { l1: { stroke: 'red' } } })
    expect(map.setFilter).not.toHaveBeenCalledWith(expect.stringContaining('stale'), expect.anything())
  })

  test('active features get selected-style overlay line on top', () => {
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR
    const stylesMap = { l1: { stroke: 'yellow', selectionStroke: 'black', strokeWidth: 3, activeStrokeWidth: 9 } }
    updateHighlightedFeatures({ LngLatBounds, map, activeFeatures: [{ featureId: 1, layerId: 'l1' }], stylesMap })

    const activeColorCall = map.setPaintProperty.mock.calls.find(c => c[0] === 'active-highlight-l1-line' && c[1] === LINE_COLOR)
    expect(activeColorCall?.[2]).toBe('yellow')

    const overlayColorCall = map.setPaintProperty.mock.calls.find(c => c[0] === 'active-highlight-inner-l1-line' && c[1] === LINE_COLOR)
    expect(overlayColorCall?.[2]).toBe('black')
  })

  test('overlay cleanup when active features cleared', () => {
    map._activehighlightinnerSources = new Set(['stale'])
    map.getLayer.mockImplementation(id => id === 'active-highlight-inner-stale-line' ? {} : null) // NOSONAR
    updateHighlightedFeatures({ LngLatBounds, map, activeFeatures: [], stylesMap: {} })
    expect(map.setFilter).toHaveBeenCalledWith('active-highlight-inner-stale-line', EMPTY_FILTER)
  })
})

// ─── Selected features — selected-highlight-* layers ─────────────────────────

describe('Highlighting Utils — selected fill and line', () => {
  let map

  const SELECTED_FEATURES = [
    { featureId: 1, layerId: 'l1', geometry: { type: 'Polygon' } }
  ]

  const STYLES = { l1: { stroke: 'red', selectionStroke: '#ffdd00', fill: 'blue', strokeWidth: 3 } }

  beforeEach(() => {
    map = makeMap({ _selectedhighlightSources: new Set(['stale']) })
  })

  test('creates selected-highlight-* layers with selectionStroke color', () => {
    map.getLayer.mockImplementation(id => { // NOSONAR
      if (id.includes('stale')) { return {} }
      if (id === 'l1') { return { source: 's1', type: 'fill' } }
      return null
    })
    updateHighlightedFeatures({ LngLatBounds, map, selectedFeatures: SELECTED_FEATURES, stylesMap: STYLES })
    expect(map.setFilter).toHaveBeenCalledWith(SEL_STALE_SYMBOL_LAYER, EMPTY_FILTER)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'selected-highlight-l1-line' }))
    const linePaintCall = map.setPaintProperty.mock.calls.find(c => c[0] === 'selected-highlight-l1-line' && c[1] === LINE_COLOR)
    expect(linePaintCall).toBeTruthy()
    expect(linePaintCall[2]).toBe('#ffdd00')
  })

  test('bounds matched using idProperty when set', () => {
    const features = [{ featureId: 'parcel-1', layerId: 'l1', idProperty: 'parcelId', geometry: { type: 'Polygon' } }]
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'fill' } : null) // NOSONAR
    map.queryRenderedFeatures.mockReturnValue([
      { properties: { parcelId: 'parcel-1' }, geometry: { coordinates: [[1, 2]] } }
    ])
    const bounds = updateHighlightedFeatures({ LngLatBounds, map, selectedFeatures: features, stylesMap: STYLES })
    expect(bounds).not.toBeNull()
  })

  test('bounds are calculated from selected features only', () => {
    const features = [
      { featureId: 1, layerId: 'l1', geometry: { type: 'Polygon' } },
      { featureId: 2, layerId: 'l1', geometry: { type: 'Polygon' } }
    ]
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR
    const coordMax = 10
    const coordMid = 5
    map.queryRenderedFeatures.mockReturnValue([
      { id: 1, geometry: { coordinates: [coordMax, coordMax] } },
      { id: 2, geometry: { coordinates: [[0, 0], [coordMid, coordMid]] } }
    ])
    const bounds = updateHighlightedFeatures({ LngLatBounds, map, selectedFeatures: features, stylesMap: STYLES })
    expect(bounds).toEqual([0, 0, 10, 10])
  })
})

// ─── Layer management ─────────────────────────────────────────────────────────

describe('Highlighting Utils — layer management', () => {
  let map

  beforeEach(() => {
    map = makeMap({ _activehighlightSources: new Set(['stale']) })
  })

  test('reuses existing active-highlight layer; new layers spread sourceLayer', () => {
    map.getLayer.mockImplementation(id => { // NOSONAR
      if (id === 'l1') { return { source: 's1', type: 'line' } }
      if (id === 'l2') { return { source: 's2', type: 'line', sourceLayer: 'tiles' } }
      if (id === 'active-highlight-l1-line') { return {} }
      return null
    })
    updateHighlightedFeatures({ LngLatBounds, map, activeFeatures: [{ featureId: 1, layerId: 'l1' }, { featureId: 2, layerId: 'l2' }], stylesMap: { l1: { stroke: 'blue' }, l2: { stroke: 'green' } } })
    // active-highlight-l1-line reused; active-highlight-l2-line, active-highlight-inner-l1-line, active-highlight-inner-l2-line are new
    expect(map.addLayer).toHaveBeenCalledTimes(3)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ 'source-layer': 'tiles' }))
  })

  test('returns null when no rendered features match', () => {
    expect(updateHighlightedFeatures({ LngLatBounds, map, selectedFeatures: [], stylesMap: {} })).toBeNull()
  })
})

// ─── Symbol layers ────────────────────────────────────────────────────────────

describe('Highlighting Utils — symbol layers (active cursor)', () => {
  const ACTIVE_IMAGE = 'symbol-act-abc123'
  const HIGHLIGHT_LAYER = 'active-highlight-l1-symbol'
  const ICON_IMAGE = 'icon-image'
  const ICON_ANCHOR = 'icon-anchor'
  const POINT_FEATURE = { featureId: 1, layerId: 'l1', geometry: { type: 'Point' } }

  let map

  beforeEach(() => {
    map = makeMap()
    map._activeSymbolImageMap = { [SYMBOL_IMAGE]: ACTIVE_IMAGE }
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'symbol' } : null) // NOSONAR
    map.getLayoutProperty.mockReturnValue(SYMBOL_IMAGE)
  })

  const run = (activeFeatures = [POINT_FEATURE]) =>
    updateHighlightedFeatures({ LngLatBounds, map, activeFeatures, stylesMap: { l1: {} } })

  test('creates symbol highlight layer with cursor image variant', () => {
    run()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: HIGHLIGHT_LAYER,
      type: 'symbol',
      layout: expect.objectContaining({ [ICON_IMAGE]: ACTIVE_IMAGE })
    }))
    expect(map.setLayoutProperty).toHaveBeenCalledWith(HIGHLIGHT_LAYER, ICON_IMAGE, ACTIVE_IMAGE)
  })

  test('reads icon-anchor from original layer', () => {
    map.getLayoutProperty.mockImplementation((_id, prop) => { // NOSONAR
      if (prop === ICON_IMAGE) { return SYMBOL_IMAGE }
      if (prop === ICON_ANCHOR) { return 'bottom' }
      return null
    })
    run()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      layout: expect.objectContaining({ [ICON_ANCHOR]: 'bottom' })
    }))
  })

  test('falls back to center anchor when icon-anchor is not set on original layer', () => {
    map.getLayoutProperty.mockImplementation((_id, prop) => prop === ICON_IMAGE ? SYMBOL_IMAGE : null) // NOSONAR
    run()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      layout: expect.objectContaining({ [ICON_ANCHOR]: 'center' })
    }))
  })

  test('spreads source-layer into symbol highlight layer for vector tile source', () => {
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'symbol', sourceLayer: 'points' } : null) // NOSONAR
    run()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ 'source-layer': 'points' }))
  })

  test('reuses existing symbol highlight layer without re-adding', () => {
    map.getLayer.mockImplementation(id => { // NOSONAR
      if (id === 'l1') { return { source: 's1', type: 'symbol' } }
      if (id === HIGHLIGHT_LAYER) { return { source: 's1', type: 'symbol' } }
      return null
    })
    run()
    expect(map.addLayer).not.toHaveBeenCalled()
    expect(map.setLayoutProperty).toHaveBeenCalledWith(HIGHLIGHT_LAYER, ICON_IMAGE, ACTIVE_IMAGE)
  })

  test('skips highlight when icon-image has no entry in _activeSymbolImageMap', () => {
    map.getLayoutProperty.mockReturnValue(SYMBOL_IMAGE)
    map._activeSymbolImageMap = {} // no mapping registered
    run()
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  test('copies icon-offset from the original layer when present (draw points need it, datasets do not)', () => {
    map.getLayoutProperty.mockImplementation((_id, prop) => { // NOSONAR
      if (prop === ICON_IMAGE) { return SYMBOL_IMAGE }
      if (prop === 'icon-offset') { return [0, 4.4] }
      return null
    })
    run()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      layout: expect.objectContaining({ 'icon-offset': [0, 4.4] })
    }))
    expect(map.setLayoutProperty).toHaveBeenCalledWith(HIGHLIGHT_LAYER, 'icon-offset', [0, 4.4])
  })

  test('omits icon-offset entirely when the original layer has none', () => {
    map.getLayoutProperty.mockImplementation((_id, prop) => (prop === ICON_IMAGE ? SYMBOL_IMAGE : undefined)) // NOSONAR
    run()
    const call = map.addLayer.mock.calls[0][0]
    expect(call.layout).not.toHaveProperty('icon-offset')
    expect(map.setLayoutProperty).not.toHaveBeenCalledWith(HIGHLIGHT_LAYER, 'icon-offset', expect.anything())
  })

  // Draw's point-symbol layer has a per-feature data-driven icon-image (each point can carry
  // a different symbol config) — the highlight layer must reference the SAME per-feature
  // expression against the precomputed symbolActiveImageId/symbolSelectedImageId property
  // (pointSymbolImages.js) rather than reverse-mapping a single shared id.
  test('references the per-feature symbolActiveImageId property when icon-image is a data-driven expression', () => {
    map.getLayoutProperty.mockImplementation((_id, prop) => // NOSONAR
      prop === ICON_IMAGE ? ['get', 'user_symbolImageId'] : null)
    run()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      layout: expect.objectContaining({ [ICON_IMAGE]: ['get', 'user_symbolActiveImageId'] })
    }))
    expect(map.setLayoutProperty).toHaveBeenCalledWith(HIGHLIGHT_LAYER, ICON_IMAGE, ['get', 'user_symbolActiveImageId'])
  })

  test('cleans up stale symbol highlight layer', () => {
    map._activehighlightSources = new Set(['stale'])
    map.getLayer.mockImplementation(id => id === STALE_SYMBOL_LAYER ? { type: 'symbol' } : null) // NOSONAR
    run([])
    expect(map.setFilter).toHaveBeenCalledWith(STALE_SYMBOL_LAYER, EMPTY_FILTER)
  })
})

describe('Highlighting Utils — symbol layers (committed selection)', () => {
  const SELECTED_IMAGE = 'symbol-sel-abc123'
  const SEL_HIGHLIGHT_LAYER = 'selected-highlight-l1-symbol'
  const ICON_IMAGE = 'icon-image'
  const POINT_FEATURE = { featureId: 1, layerId: 'l1', geometry: { type: 'Point' } }

  let map

  beforeEach(() => {
    map = makeMap()
    map._selectedSymbolImageMap = { [SYMBOL_IMAGE]: SELECTED_IMAGE }
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'symbol' } : null) // NOSONAR
    map.getLayoutProperty.mockReturnValue(SYMBOL_IMAGE)
  })

  const run = (selectedFeatures = [POINT_FEATURE]) =>
    updateHighlightedFeatures({ LngLatBounds, map, selectedFeatures, stylesMap: { l1: {} } })

  test('creates selected-highlight symbol layer with selected image variant', () => {
    run()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: SEL_HIGHLIGHT_LAYER,
      type: 'symbol',
      layout: expect.objectContaining({ [ICON_IMAGE]: SELECTED_IMAGE })
    }))
  })

  test('skips highlight when icon-image has no entry in _selectedSymbolImageMap', () => {
    map._selectedSymbolImageMap = {}
    run()
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  test('references the per-feature symbolSelectedImageId property when icon-image is a data-driven expression', () => {
    map.getLayoutProperty.mockImplementation((_id, prop) => // NOSONAR
      prop === ICON_IMAGE ? ['get', 'user_symbolImageId'] : null)
    run()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      layout: expect.objectContaining({ [ICON_IMAGE]: ['get', 'user_symbolSelectedImageId'] })
    }))
  })
})

// ─── fill-extrusion layers (3D buildings) ────────────────────────────────────

describe('Highlighting Utils — fill-extrusion layers', () => {
  const LAYER_ID = 'buildings 3D'
  const STYLES = { [LAYER_ID]: { stroke: '#aaa', selectionStroke: '#0073cc', strokeWidth: 3, activeStrokeWidth: 6 } }
  const LINE_LAYER_ID = 'selected-highlight-buildings 3D-line'

  let map

  beforeEach(() => {
    map = makeMap()
    map.getLayer.mockImplementation(id => {
      if (id === LAYER_ID) return { source: 'composite', sourceLayer: 'building', type: 'fill-extrusion' }
      return null
    })
  })

  test('adds a line overlay layer above the extrusion pass', () => {
    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 'uuid-abc', layerId: LAYER_ID, idProperty: 'uuid' }],
      stylesMap: STYLES
    })
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: LINE_LAYER_ID,
      type: 'line',
      source: 'composite',
      'source-layer': 'building'
    }))
    expect(map.moveLayer).toHaveBeenCalledWith(LINE_LAYER_ID)
  })

  test('filters by idProperty expression when set', () => {
    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 'uuid-abc', layerId: LAYER_ID, idProperty: 'uuid' }],
      stylesMap: STYLES
    })
    expect(map.setFilter).toHaveBeenCalledWith(
      LINE_LAYER_ID,
      ['in', ['get', 'uuid'], ['literal', ['uuid-abc']]]
    )
  })

  test('filters by feature id when no idProperty', () => {
    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 42, layerId: LAYER_ID }],
      stylesMap: STYLES
    })
    expect(map.setFilter).toHaveBeenCalledWith(
      LINE_LAYER_ID,
      ['in', ['id'], ['literal', [42]]]
    )
  })

  test('paints the line overlay with selectionStroke colour', () => {
    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 'uuid-abc', layerId: LAYER_ID, idProperty: 'uuid' }],
      stylesMap: STYLES
    })
    const colorCall = map.setPaintProperty.mock.calls.find(
      c => c[0] === LINE_LAYER_ID && c[1] === 'line-color'
    )
    expect(colorCall?.[2]).toBe('#0073cc')
  })

  test('reuses existing line layer without re-adding', () => {
    map.getLayer.mockImplementation(id => {
      if (id === LAYER_ID) return { source: 'composite', sourceLayer: 'building', type: 'fill-extrusion' }
      if (id === LINE_LAYER_ID) return { type: 'line' }
      return null
    })
    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 'uuid-abc', layerId: LAYER_ID, idProperty: 'uuid' }],
      stylesMap: STYLES
    })
    expect(map.addLayer).not.toHaveBeenCalled()
    expect(map.setPaintProperty).toHaveBeenCalledWith(LINE_LAYER_ID, 'line-color', '#0073cc')
  })
})

describe('Highlighting Utils — missing style entry', () => {
  test('skips highlight when feature layerId has no entry in stylesMap', () => {
    const map = makeMap()
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR

    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 1, layerId: 'l1' }],
      stylesMap: {}
    })

    expect(map.addLayer).not.toHaveBeenCalled()
    expect(map.setFilter).not.toHaveBeenCalled()
  })

  test('returns early when base layer is not found', () => {
    const map = makeMap()
    let callCount = 0
    map.getLayer.mockImplementation((id) => {
      // First call from groupFeaturesByLayer - return a valid layer
      if (id === 'l1' && callCount === 0) {
        callCount++
        return { source: 's1', type: 'line' }
      }
      // Subsequent calls from applyLayerHighlight - return null to trigger early return
      return null
    })

    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 1, layerId: 'l1' }],
      stylesMap: { l1: { stroke: 'red' } }
    })

    expect(map.addLayer).not.toHaveBeenCalled()
  })

  test('handles unexpected geometry type gracefully', () => {
    const map = makeMap()
    map.getLayer.mockImplementation((id) => {
      if (id === 'l1') {
        return { source: 's1', type: 'raster' }
      }
      return null
    })

    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 1, layerId: 'l1' }],
      stylesMap: { l1: { stroke: 'red' } }
    })

    // Should not throw and not apply any highlighting for unexpected type
    expect(map.addLayer).not.toHaveBeenCalled()
  })
})

// mapbox-gl-draw duplicates every one of its own layers into a `.cold`/`.hot` sibling pair,
// each backed by its own source — a feature moves out of cold and into hot the instant any of
// its own properties change, only cooling back down on a later render with nothing changed.
// A selection payload's layerId (e.g. 'point-symbol.cold') is captured once, at selection time
// — if the feature later moves to the sibling bucket, the recorded layer still exists (so a
// naive "does the layer exist" check looks fine) but its source no longer holds the feature.
describe('Highlighting Utils — mapbox-gl-draw cold/hot sibling layers', () => {
  test('highlights a selected feature that has moved from its recorded .cold layer into the sibling .hot bucket', () => {
    const map = makeMap()
    map.getLayer.mockImplementation(id => { // NOSONAR
      if (id === 'point-symbol.cold') { return { source: 'mapbox-gl-draw-cold', type: 'symbol' } }
      if (id === 'point-symbol.hot') { return { source: 'mapbox-gl-draw-hot', type: 'symbol' } }
      return null
    })
    map.getLayoutProperty.mockImplementation((id, prop) => // NOSONAR
      prop === 'icon-image' ? SYMBOL_IMAGE : undefined)
    map._selectedSymbolImageMap = { [SYMBOL_IMAGE]: 'symbol-sel-xyz' }

    // The feature's own current geometry lives on the hot source (it moved there when its
    // properties were last refreshed) — only stylesMap['point-symbol.cold'] is registered,
    // matching how the demo only registers the .cold layerId for selectability.
    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 'p1', layerId: 'point-symbol.cold', geometry: { type: 'Point' } }],
      stylesMap: { 'point-symbol.cold': { stroke: 'red', selectionStroke: 'black', strokeWidth: 2 } }
    })

    // A highlight layer gets created/filtered for BOTH the recorded source and its sibling —
    // whichever one the feature actually lives in right now, this finds it.
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ source: 'mapbox-gl-draw-cold' }))
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ source: 'mapbox-gl-draw-hot' }))
  })

  test('does not touch a non-draw layer id that happens to not end in .cold/.hot', () => {
    const map = makeMap()
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR

    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 1, layerId: 'l1' }],
      stylesMap: { l1: { stroke: 'red', selectionStroke: 'black', strokeWidth: 2 } }
    })

    expect(map.getLayer).not.toHaveBeenCalledWith('l1.hot')
    expect(map.getLayer).not.toHaveBeenCalledWith('l1.cold')
  })
})

// mapbox-gl-draw stores every geometry type (point, polygon, line) in the same cold/hot
// sources — a point and a polygon selected together share a source, even though they're
// rendered by different layers (point-symbol vs fill-inactive). Grouping by source alone would
// collapse both into one group that can only resolve one geometry-type path, silently dropping
// whichever feature's highlight didn't win.
describe('Highlighting Utils — multi-select across geometry types sharing a source', () => {
  test('a selected point and a selected polygon sharing the same mapbox-gl-draw source both get their own highlight', () => {
    const map = makeMap()
    map.getLayer.mockImplementation(id => { // NOSONAR
      if (id === 'point-symbol.cold') { return { source: 'mapbox-gl-draw-cold', type: 'symbol' } }
      if (id === 'fill-inactive.cold') { return { source: 'mapbox-gl-draw-cold', type: 'fill' } }
      return null
    })
    map.getLayoutProperty.mockImplementation((id, prop) => // NOSONAR
      prop === 'icon-image' ? SYMBOL_IMAGE : undefined)
    map._selectedSymbolImageMap = { [SYMBOL_IMAGE]: 'symbol-sel-xyz' }

    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [
        { featureId: 'pt1', layerId: 'point-symbol.cold', geometry: { type: 'Point' } },
        { featureId: 'poly1', layerId: 'fill-inactive.cold', geometry: { type: 'Polygon' } }
      ],
      stylesMap: {
        'point-symbol.cold': { stroke: 'red', selectionStroke: 'black', strokeWidth: 2 },
        'fill-inactive.cold': { stroke: 'red', selectionStroke: 'black', fill: 'blue', strokeWidth: 2 }
      }
    })

    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'selected-highlight-point-symbol.cold-symbol',
      type: 'symbol'
    }))
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'selected-highlight-fill-inactive.cold-fill',
      type: 'fill'
    }))
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'selected-highlight-fill-inactive.cold-line',
      type: 'line'
    }))
  })
})
