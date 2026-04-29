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
const EXPECTED_NEW_LAYER_COUNT = 3

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
      if (id === 'active-highlight-s2-fill') { return {} }
      return null
    })

    updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, activeFeatures: ALL_BRANCHES_FEATURES, stylesMap: ALL_BRANCHES_STYLES })

    expect(map.setFilter).toHaveBeenCalledWith('active-highlight-stale-fill', EMPTY_FILTER)
    expect(map.setFilter).toHaveBeenCalledWith(STALE_SYMBOL_LAYER, EMPTY_FILTER)
    expect(map.setFilter).toHaveBeenCalledWith('active-highlight-s2-fill', EMPTY_FILTER)
    expect(map.setFilter).toHaveBeenCalledWith('active-highlight-s2-line', expect.arrayContaining([['get', 'customId']]))
  })

  test('null _activehighlightSources falls back to empty set; line geom skips absent fill layer', () => {
    map._activehighlightSources = null
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR
    updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, activeFeatures: [{ featureId: 1, layerId: 'l1' }], stylesMap: { l1: { stroke: 'red' } } })
    expect(map.setFilter).not.toHaveBeenCalledWith('active-highlight-s1-fill', expect.anything())
  })

  test('persistent source skips cleanup; missing stale layers skip setFilter', () => {
    map._activehighlightSources = new Set(['stale', 's1'])
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR
    updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, activeFeatures: [{ featureId: 1, layerId: 'l1' }], stylesMap: { l1: { stroke: 'red' } } })
    expect(map.setFilter).not.toHaveBeenCalledWith(expect.stringContaining('stale'), expect.anything())
  })

  test('active features get selected-style overlay line on top', () => {
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR
    const stylesMap = { l1: { stroke: 'yellow', selectionStroke: 'black', strokeWidth: 3, activeStrokeWidth: 9 } }
    updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, activeFeatures: [{ featureId: 1, layerId: 'l1' }], stylesMap })

    const activeColorCall = map.setPaintProperty.mock.calls.find(c => c[0] === 'active-highlight-s1-line' && c[1] === LINE_COLOR)
    expect(activeColorCall?.[2]).toBe('yellow')

    const overlayColorCall = map.setPaintProperty.mock.calls.find(c => c[0] === 'active-highlight-inner-s1-line' && c[1] === LINE_COLOR)
    expect(overlayColorCall?.[2]).toBe('black')
  })

  test('overlay cleanup when active features cleared', () => {
    map._activehighlightinnerSources = new Set(['stale'])
    map.getLayer.mockImplementation(id => id === 'active-highlight-inner-stale-line' ? {} : null) // NOSONAR
    updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, activeFeatures: [], stylesMap: {} })
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
    updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, selectedFeatures: SELECTED_FEATURES, stylesMap: STYLES })
    expect(map.setFilter).toHaveBeenCalledWith(SEL_STALE_SYMBOL_LAYER, EMPTY_FILTER)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'selected-highlight-s1-line' }))
    const linePaintCall = map.setPaintProperty.mock.calls.find(c => c[0] === 'selected-highlight-s1-line' && c[1] === LINE_COLOR)
    expect(linePaintCall).toBeTruthy()
    expect(linePaintCall[2]).toBe('#ffdd00')
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
    const bounds = updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, selectedFeatures: features, stylesMap: STYLES })
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
      if (id === 'active-highlight-s1-line') { return {} }
      return null
    })
    updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, activeFeatures: [{ featureId: 1, layerId: 'l1' }, { featureId: 2, layerId: 'l2' }], stylesMap: { l1: { stroke: 'blue' }, l2: { stroke: 'green' } } })
    // active-highlight-s1-line reused; active-highlight-s2-line, active-highlight-inner-s1-line, active-highlight-inner-s2-line are new
    expect(map.addLayer).toHaveBeenCalledTimes(3)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ 'source-layer': 'tiles' }))
  })

  test('returns null when no rendered features match', () => {
    expect(updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, selectedFeatures: [], stylesMap: {} })).toBeNull()
  })
})

// ─── Symbol layers ────────────────────────────────────────────────────────────

describe('Highlighting Utils — symbol layers (active cursor)', () => {
  const ACTIVE_IMAGE = 'symbol-act-abc123'
  const HIGHLIGHT_LAYER = 'active-highlight-s1-symbol'
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
    updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, activeFeatures, stylesMap: { l1: {} } })

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

  test('cleans up stale symbol highlight layer', () => {
    map._activehighlightSources = new Set(['stale'])
    map.getLayer.mockImplementation(id => id === STALE_SYMBOL_LAYER ? { type: 'symbol' } : null) // NOSONAR
    run([])
    expect(map.setFilter).toHaveBeenCalledWith(STALE_SYMBOL_LAYER, EMPTY_FILTER)
  })
})

describe('Highlighting Utils — symbol layers (committed selection)', () => {
  const SELECTED_IMAGE = 'symbol-sel-abc123'
  const SEL_HIGHLIGHT_LAYER = 'selected-highlight-s1-symbol'
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
    updateHighlightedFeatures({ LngLatBounds: LngLatBounds, map, selectedFeatures, stylesMap: { l1: {} } })

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
})
