import { updateHighlightedFeatures } from './highlightFeatures.js'

function lngLatBounds () {
  this.coords = []
  this.extend = (c) => this.coords.push(c)
  this.getWest = () => Math.min(...this.coords.map(c => c[0]))
  this.getSouth = () => Math.min(...this.coords.map(c => c[1]))
  this.getEast = () => Math.max(...this.coords.map(c => c[0]))
  this.getNorth = () => Math.max(...this.coords.map(c => c[1]))
}

const EMPTY_FILTER = ['==', 'id', '']
const STALE_SYMBOL_LAYER = 'highlight-stale-symbol'

const makeMap = (overrides = {}) => ({
  _highlightedSources: new Set(),
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

describe('Highlighting Utils — fill and line', () => {
  let map

  const ALL_BRANCHES_FEATURES = [
    { featureId: 1, layerId: 'l1', geometry: { type: 'Polygon' } },
    { featureId: 2, layerId: 'l1', geometry: { type: 'MultiPolygon' } },
    { featureId: 3, layerId: 'invalid' },
    { featureId: 4, layerId: 'l2', idProperty: 'customId', geometry: { type: 'Point' } }
  ]

  const ALL_BRANCHES_STYLES = { l1: { stroke: 'red', fill: 'blue' }, l2: { stroke: 'green' } }

  beforeEach(() => {
    map = makeMap({ _highlightedSources: new Set(['stale']) })
  })

  test('All branches', () => {
    expect(updateHighlightedFeatures({ map: null })).toBeNull()

    map.getLayer.mockImplementation((id) => { // NOSONAR
      if (id.includes('stale')) { return {} }
      if (id === 'l1') { return { source: 's1', type: 'fill' } }
      if (id === 'l2') { return { source: 's2', type: 'line' } }
      if (id === 'highlight-s2-fill') { return {} }
      return null
    })

    const coordMax = 10
    const coordMid = 5
    map.queryRenderedFeatures.mockReturnValue([
      { id: 1, geometry: { coordinates: [coordMax, coordMax] } },
      { id: 2, properties: { customId: 4 }, geometry: { coordinates: [[0, 0], [coordMid, coordMid]] } }
    ])

    const bounds = updateHighlightedFeatures({ LngLatBounds: lngLatBounds, map, selectedFeatures: ALL_BRANCHES_FEATURES, stylesMap: ALL_BRANCHES_STYLES })

    expect(map.setFilter).toHaveBeenCalledWith('highlight-stale-fill', EMPTY_FILTER)
    expect(map.setFilter).toHaveBeenCalledWith(STALE_SYMBOL_LAYER, EMPTY_FILTER)
    expect(map.setFilter).toHaveBeenCalledWith('highlight-s2-fill', EMPTY_FILTER)
    expect(map.setFilter).toHaveBeenCalledWith('highlight-s2-line', expect.arrayContaining([['get', 'customId']]))
    expect(bounds).toEqual([0, 0, 10, 10])
  })

  test('null _highlightedSources falls back to empty set; line geom skips absent fill layer', () => {
    map._highlightedSources = null
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR
    updateHighlightedFeatures({ LngLatBounds: lngLatBounds, map, selectedFeatures: [{ featureId: 1, layerId: 'l1' }], stylesMap: { l1: { stroke: 'red' } } })
    expect(map.setFilter).not.toHaveBeenCalledWith('highlight-s1-fill', expect.anything())
  })

  test('persistent source skips cleanup; missing stale layers skip setFilter', () => {
    map._highlightedSources = new Set(['stale', 's1'])
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null) // NOSONAR
    updateHighlightedFeatures({ LngLatBounds: lngLatBounds, map, selectedFeatures: [{ featureId: 1, layerId: 'l1' }], stylesMap: { l1: { stroke: 'red' } } })
    expect(map.setFilter).not.toHaveBeenCalledWith(expect.stringContaining('stale'), expect.anything())
  })
})

describe('Highlighting Utils — layer management', () => {
  let map

  beforeEach(() => {
    map = makeMap({ _highlightedSources: new Set(['stale']) })
  })

  test('reuses existing highlight layer; new layer spreads sourceLayer', () => {
    map.getLayer.mockImplementation(id => { // NOSONAR
      if (id === 'l1') { return { source: 's1', type: 'line' } }
      if (id === 'l2') { return { source: 's2', type: 'line', sourceLayer: 'tiles' } }
      if (id === 'highlight-s1-line') { return {} }
      return null
    })
    updateHighlightedFeatures({ LngLatBounds: lngLatBounds, map, selectedFeatures: [{ featureId: 1, layerId: 'l1' }, { featureId: 2, layerId: 'l2' }], stylesMap: { l1: { stroke: 'blue' }, l2: { stroke: 'green' } } })
    expect(map.addLayer).toHaveBeenCalledTimes(1)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ 'source-layer': 'tiles' }))
  })

  test('returns null when no rendered features match', () => {
    expect(updateHighlightedFeatures({ LngLatBounds: lngLatBounds, map, selectedFeatures: [], stylesMap: {} })).toBeNull()
  })
})

describe('Highlighting Utils — symbol layers', () => {
  const SYMBOL_IMAGE = 'symbol-abc123'
  const SELECTED_IMAGE = 'symbol-sel-abc123'
  const HIGHLIGHT_LAYER = 'highlight-s1-symbol'
  const ICON_IMAGE = 'icon-image'
  const ICON_ANCHOR = 'icon-anchor'
  const POINT_FEATURE = { featureId: 1, layerId: 'l1', geometry: { type: 'Point' } }

  let map

  beforeEach(() => {
    map = makeMap()
    map._symbolImageMap = { [SYMBOL_IMAGE]: SELECTED_IMAGE }
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'symbol' } : null) // NOSONAR
    map.getLayoutProperty.mockReturnValue(SYMBOL_IMAGE)
  })

  const run = (selectedFeatures = [POINT_FEATURE]) =>
    updateHighlightedFeatures({ LngLatBounds: lngLatBounds, map, selectedFeatures, stylesMap: { l1: {} } })

  test('creates symbol highlight layer with selected image variant', () => {
    run()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: HIGHLIGHT_LAYER,
      type: 'symbol',
      layout: expect.objectContaining({ [ICON_IMAGE]: SELECTED_IMAGE })
    }))
    expect(map.setLayoutProperty).toHaveBeenCalledWith(HIGHLIGHT_LAYER, ICON_IMAGE, SELECTED_IMAGE)
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
    expect(map.setLayoutProperty).toHaveBeenCalledWith(HIGHLIGHT_LAYER, ICON_IMAGE, SELECTED_IMAGE)
  })

  test('skips highlight when icon-image has no entry in _symbolImageMap', () => {
    map.getLayoutProperty.mockReturnValue('symbol-abc123')
    map._symbolImageMap = {} // no mapping registered
    run()
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  test('cleans up stale symbol highlight layer', () => {
    map._highlightedSources = new Set(['stale'])
    map.getLayer.mockImplementation(id => id === STALE_SYMBOL_LAYER ? { type: 'symbol' } : null) // NOSONAR
    run([])
    expect(map.setFilter).toHaveBeenCalledWith(STALE_SYMBOL_LAYER, EMPTY_FILTER)
  })
})
