import { updateHighlightedFeatures } from './highlightFeatures.js'

describe('Highlighting Utils', () => {
  let map
  const LngLatBounds = function () {
    this.coords = []
    this.extend = (c) => this.coords.push(c)
    this.getWest = () => Math.min(...this.coords.map(c => c[0]))
    this.getSouth = () => Math.min(...this.coords.map(c => c[1]))
    this.getEast = () => Math.max(...this.coords.map(c => c[0]))
    this.getNorth = () => Math.max(...this.coords.map(c => c[1]))
  }

  beforeEach(() => {
    map = {
      _highlightedSources: new Set(['stale']),
      getLayer: jest.fn(),
      addLayer: jest.fn(),
      moveLayer: jest.fn(),
      setFilter: jest.fn(),
      setPaintProperty: jest.fn(),
      queryRenderedFeatures: jest.fn()
    }
  })

  test('All branches', () => {
    // Coverage for Line 93: Null map check
    expect(updateHighlightedFeatures({ map: null })).toBeNull()

    map.getLayer.mockImplementation((id) => {
      if (id.includes('stale')) return true // Coverage for Line 49
      if (id === 'l1') return { source: 's1', type: 'fill' }
      if (id === 'l2') return { source: 's2', type: 'line' }
      if (id === 'highlight-s2-fill') return true // Coverage for Line 124
      return null // Coverage for Line 13
    })

    const selectedFeatures = [
      // Coverage for Lines 37-40: Polygon & MultiPolygon checks
      { featureId: 1, layerId: 'l1', geometry: { type: 'Polygon' } },
      { featureId: 2, layerId: 'l1', geometry: { type: 'MultiPolygon' } },
      // Coverage for Line 13: Invalid layer
      { featureId: 3, layerId: 'invalid' },
      // Coverage for Line 116: idProperty exists
      { featureId: 4, layerId: 'l2', idProperty: 'customId', geometry: { type: 'Point' } }
    ]

    const stylesMap = {
      l1: { stroke: 'red', fill: 'blue' },
      l2: { stroke: 'green' }
    }

    // Coverage for Lines 78-80: Recursive coordinate handling (numbers vs arrays)
    map.queryRenderedFeatures.mockReturnValue([
      { id: 1, geometry: { coordinates: [10, 10] } }, // Simple point
      { id: 2, properties: { customId: 4 }, geometry: { coordinates: [[0, 0], [5, 5]] } } // Nested
    ])

    const bounds = updateHighlightedFeatures({ LngLatBounds, map, selectedFeatures, stylesMap })

    // Line 13 verify: map.getLayer returned null and function returned early
    // Line 49-50 verify: Stale sources filtered out
    expect(map.setFilter).toHaveBeenCalledWith('highlight-stale-fill', ['==', 'id', ''])

    // Line 124 verify: Clear fill highlight when switching to line geometry
    expect(map.setFilter).toHaveBeenCalledWith('highlight-s2-fill', ['==', 'id', ''])

    // Line 116 verify: Using ['get', idProperty]
    expect(map.setFilter).toHaveBeenCalledWith('highlight-s2-line', expect.arrayContaining([['get', 'customId']]))

    // Line 80-82 verify: Recursive LngLatBounds logic
    expect(bounds).toEqual([0, 0, 10, 10])
  })

  test('undefined _highlightedSources falls back to empty set; line geom skips absent fill layer', () => {
    // line 93: || new Set() fallback; line 124 false: no pre-existing fill to clear
    map._highlightedSources = undefined
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null)
    map.queryRenderedFeatures.mockReturnValue([])
    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 1, layerId: 'l1' }],
      stylesMap: { l1: { stroke: 'red' } }
    })
    expect(map.setFilter).not.toHaveBeenCalledWith('highlight-s1-fill', expect.anything())
  })

  test('persistent source skips cleanup; missing stale layers skip setFilter', () => {
    // line 37 false: src IS in currentSources; line 41 false: getLayer returns null for stale layers
    map._highlightedSources = new Set(['stale', 's1'])
    map.getLayer.mockImplementation(id => id === 'l1' ? { source: 's1', type: 'line' } : null)
    map.queryRenderedFeatures.mockReturnValue([])
    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [{ featureId: 1, layerId: 'l1' }],
      stylesMap: { l1: { stroke: 'red' } }
    })
    expect(map.setFilter).not.toHaveBeenCalledWith(expect.stringContaining('stale'), expect.anything())
  })

  test('reuses existing highlight layer; new layer spreads sourceLayer', () => {
    // line 50 false: getLayer truthy → skip addLayer for s1
    // line 55: srcLayer truthy → 'source-layer' spread in addLayer for s2
    map.getLayer.mockImplementation(id => {
      if (id === 'l1') return { source: 's1', type: 'line' }
      if (id === 'l2') return { source: 's2', type: 'line', sourceLayer: 'tiles' }
      if (id === 'highlight-s1-line') return true
      return null
    })
    map.queryRenderedFeatures.mockReturnValue([])
    updateHighlightedFeatures({
      LngLatBounds,
      map,
      selectedFeatures: [
        { featureId: 1, layerId: 'l1' },
        { featureId: 2, layerId: 'l2' }
      ],
      stylesMap: { l1: { stroke: 'blue' }, l2: { stroke: 'green' } }
    })
    expect(map.addLayer).toHaveBeenCalledTimes(1)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ 'source-layer': 'tiles' }))
  })

  test('Empty features coverage', () => {
    // Coverage for Line 72: empty renderedFeatures
    map.getLayer.mockReturnValue({ source: 's1', type: 'line' })
    map.queryRenderedFeatures.mockReturnValue([])
    const res = updateHighlightedFeatures({ LngLatBounds, map, selectedFeatures: [], stylesMap: {} })
    expect(res).toBeNull()
  })
})
