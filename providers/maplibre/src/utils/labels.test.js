import {
  getGeometryCenter, evalInterpolate, getHighlightColors, extractTextPropertyName,
  buildLabelFromFeature, buildLabelsFromLayers, findClosestLabel,
  createHighlightLayerConfig, removeHighlightLayer, applyHighlight,
  navigateToNextLabel, createMapLabelNavigator
} from './labels.js'

jest.mock('./spatial.js', () => ({ spatialNavigate: jest.fn() }))
jest.mock('./calculateLinearTextSize.js', () => ({ calculateLinearTextSize: jest.fn(() => 12) }))

import { spatialNavigate } from './spatial.js'
import { calculateLinearTextSize } from './calculateLinearTextSize.js'

describe('labels utils', () => {

  test('getGeometryCenter all geometry types', () => {
    expect(getGeometryCenter({ type: 'Point', coordinates: [1, 2] })).toEqual([1, 2])
    expect(getGeometryCenter({ type: 'MultiPoint', coordinates: [[3, 4]] })).toEqual([3, 4])
    expect(getGeometryCenter({ type: 'LineString', coordinates: [[0, 0], [4, 4]] })).toEqual([2, 2])
    expect(getGeometryCenter({ type: 'MultiLineString', coordinates: [[[0, 0], [4, 4]]] })).toEqual([2, 2])
    expect(getGeometryCenter({ type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2]]] })).toEqual([1, 1])
    expect(getGeometryCenter({ type: 'MultiPolygon', coordinates: [[[[0, 0], [2, 0], [2, 2], [0, 2]]]] })).toEqual([1, 1])
    expect(getGeometryCenter({ type: 'GeometryCollection', coordinates: [] })).toBeNull()
  })

  test('evalInterpolate all branches', () => {
    expect(evalInterpolate(14, 10)).toBe(14)
    expect(evalInterpolate('label', 10)).toBe(12)
    expect(calculateLinearTextSize).toHaveBeenCalledWith('label', 10)
    expect(evalInterpolate(['literal', 'x'], 10)).toBe(12)
    expect(() => evalInterpolate(['interpolate', ['linear'], ['get', 'p'], 5, 10], 10)).toThrow()
    const expr = ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 20]
    expect(evalInterpolate(expr, 3)).toBe(10)    // zoom <= z0
    expect(evalInterpolate(expr, 7.5)).toBe(15)  // interpolated
    expect(evalInterpolate(expr, 15)).toBe(20)   // beyond last stop
  })

  test('getHighlightColors', () => {
    expect(getHighlightColors(true)).toEqual({ text: '#ffffff', halo: '#000000' })
    expect(getHighlightColors(false)).toEqual({ text: '#000000', halo: '#ffffff' })
  })

  test('extractTextPropertyName all branches', () => {
    expect(extractTextPropertyName('{name}')).toBe('name')
    expect(extractTextPropertyName('plain')).toBeUndefined()
    expect(extractTextPropertyName(['label', ['get', 'title']])).toBe('title')
    expect(extractTextPropertyName(['label'])).toBeUndefined()
    expect(extractTextPropertyName(null)).toBeNull()
  })

  test('buildLabelFromFeature: null center returns null; valid returns label', () => {
    const map = { project: jest.fn(({ lng, lat }) => ({ x: lng, y: lat })) }
    expect(buildLabelFromFeature(
      { geometry: { type: 'Unknown', coordinates: [] }, properties: {} }, {}, 'n', map
    )).toBeNull()
    const result = buildLabelFromFeature(
      { geometry: { type: 'Point', coordinates: [1, 2] }, properties: { n: 'A' } },
      { id: 'l1' }, 'n', map
    )
    expect(result).toMatchObject({ text: 'A', x: 1, y: 2 })
  })

  test('buildLabelsFromLayers: skips no-propName layer; filters null-center labels', () => {
    const map = { project: jest.fn(({ lng, lat }) => ({ x: lng, y: lat })) }
    const layers = [
      { id: 'l1', layout: {} },
      { id: 'l2', layout: { 'text-field': '{name}' } }
    ]
    const features = [
      { layer: { id: 'l2' }, properties: { name: 'Town' }, geometry: { type: 'Point', coordinates: [1, 2] } },
      { layer: { id: 'l2' }, properties: { name: 'X' }, geometry: { type: 'Unknown', coordinates: [] } }
    ]
    const result = buildLabelsFromLayers(map, layers, features)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Town')
  })

  test('findClosestLabel: empty → undefined; returns closest; skips farther', () => {
    expect(findClosestLabel([], { x: 0, y: 0 })).toBeUndefined()
    const labels = [{ x: 2, y: 0 }, { x: 10, y: 0 }]  // closer first → second hits false branch
    expect(findClosestLabel(labels, { x: 0, y: 0 })).toBe(labels[0])
  })

  test('createHighlightLayerConfig returns merged config', () => {
    const config = createHighlightLayerConfig(
      { id: 'sl', type: 'symbol', layout: { 'text-font': ['Open Sans'] }, paint: {} },
      18, { text: '#fff', halo: '#000' }
    )
    expect(config.id).toBe('highlight-sl')
    expect(config.layout['text-size']).toBe(18)
    expect(config.layout['text-allow-overlap']).toBe(true)
    expect(config.paint['text-color']).toBe('#fff')
  })

  test('removeHighlightLayer: skips when no id or layer absent; removes when present', () => {
    const map = { getLayer: jest.fn(), removeLayer: jest.fn() }
    const state = { highlightLayerId: null, highlightedExpr: 'x' }
    removeHighlightLayer(map, state)
    expect(map.removeLayer).not.toHaveBeenCalled()
    state.highlightLayerId = 'h1'
    map.getLayer.mockReturnValue(null)
    removeHighlightLayer(map, state)
    expect(map.removeLayer).not.toHaveBeenCalled()
    map.getLayer.mockReturnValue(true)
    removeHighlightLayer(map, state)
    expect(map.removeLayer).toHaveBeenCalledWith('h1')
    expect(state.highlightLayerId).toBeNull()
  })

  test('applyHighlight: early returns without feature.layer; applies otherwise', () => {
    const map = {
      getLayer: jest.fn(), removeLayer: jest.fn(),
      getSource: jest.fn(() => ({ setData: jest.fn() })),
      getZoom: jest.fn(() => 10), addLayer: jest.fn(), moveLayer: jest.fn()
    }
    const state = { highlightLayerId: null, highlightedExpr: null, isDarkStyle: false }
    applyHighlight(map, null, state)
    applyHighlight(map, { feature: null }, state)
    applyHighlight(map, { feature: {} }, state)
    expect(map.addLayer).not.toHaveBeenCalled()
    applyHighlight(map, {
      feature: { id: 1, type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] }, layer: { id: 'l1' } },
      layer: { id: 'l1', layout: { 'text-size': 12 }, paint: {} }
    }, state)
    expect(map.addLayer).toHaveBeenCalled()
    expect(map.moveLayer).toHaveBeenCalledWith('highlight-l1')
  })

  test('navigateToNextLabel all branches', () => {
    expect(navigateToNextLabel('ArrowRight', { currentPixel: null })).toBeNull()
    expect(navigateToNextLabel('ArrowRight', {
      currentPixel: { x: 1, y: 1 }, labels: [{ x: 1, y: 1 }]
    })).toBeNull()
    const state = { currentPixel: { x: 0, y: 0 }, labels: [{ x: 0, y: 0 }, { x: 5, y: 5 }] }
    spatialNavigate.mockReturnValue(-1)  // out of range → use 0
    expect(navigateToNextLabel('ArrowRight', state)).toBe(state.labels[1])
    spatialNavigate.mockReturnValue(0)   // valid index
    expect(navigateToNextLabel('ArrowRight', state)).toBe(state.labels[1])
  })

  describe('createMapLabelNavigator', () => {
    let map, layers

    beforeEach(() => {
      layers = [
        { id: 's1', type: 'symbol', layout: { 'symbol-placement': 'line', 'text-field': '{name}', 'text-size': 12 }, paint: {} },
        { id: 's2', type: 'symbol', layout: { 'text-field': '{name}', 'text-size': 14 }, paint: {} },
        { id: 'fill', type: 'fill', layout: {} }
      ]
      map = {
        getStyle: jest.fn(() => ({ layers })),
        setLayoutProperty: jest.fn(),
        setPaintProperty: jest.fn(),
        getSource: jest.fn().mockReturnValueOnce(null).mockReturnValue({ setData: jest.fn() }),
        addSource: jest.fn(),
        getLayer: jest.fn(() => null),
        removeLayer: jest.fn(),
        addLayer: jest.fn(),
        moveLayer: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        queryRenderedFeatures: jest.fn(() => []),
        project: jest.fn(c => ({ x: c.lng ?? 0, y: c.lat ?? 0 })),
        getCenter: jest.fn(() => ({ lng: 0, lat: 0 })),
        getZoom: jest.fn(() => 10)
      }
    })

    test('init, full highlight lifecycle, and zoom handler branches', () => {
      const eventBus = { on: jest.fn() }
      const nav = createMapLabelNavigator(map, 'dark', { MAP_SET_STYLE: 'set-style' }, eventBus)

      // Init: line-center placement, addSource, eventBus registration
      expect(map.setLayoutProperty).toHaveBeenCalledWith('s1', 'symbol-placement', 'line-center')
      expect(map.setLayoutProperty).not.toHaveBeenCalledWith('s2', 'symbol-placement', expect.anything())
      expect(map.addSource).toHaveBeenCalled()
      expect(eventBus.on).toHaveBeenCalledWith('set-style', expect.any(Function))

      // No labels → null for both highlight functions
      expect(nav.highlightLabelAtCenter()).toBeNull()
      expect(nav.highlightNextLabel('ArrowRight')).toBeNull()

      // Zoom handler: no active highlight → no-op
      const zoomHandler = map.on.mock.calls.find(([e]) => e === 'zoom')[1]
      map.setLayoutProperty.mockClear()
      zoomHandler()
      expect(map.setLayoutProperty).not.toHaveBeenCalled()

      // One feat: highlightNext without currentPixel falls back to highlightCenter (lines 249-251)
      const feat1 = { layer: { id: 's2' }, properties: { name: 'City1' }, geometry: { type: 'Point', coordinates: [1, 2] } }
      map.queryRenderedFeatures.mockReturnValue([feat1])
      expect(nav.highlightNextLabel('ArrowRight')).toContain('City1')

      // Single label at currentPixel → navigateToNextLabel → null (lines 253-255)
      expect(nav.highlightNextLabel('ArrowRight')).toBeNull()

      // Zoom handler: active highlight → updates text-size
      map.setLayoutProperty.mockClear()
      zoomHandler()
      expect(map.setLayoutProperty).toHaveBeenCalledWith('highlight-s2', 'text-size', expect.any(Number))

      // Two feats: navigation path sets currentPixel + applies highlight (lines 256-258)
      const feat2 = { layer: { id: 's2' }, properties: { name: 'City2' }, geometry: { type: 'Point', coordinates: [3, 4] } }
      map.queryRenderedFeatures.mockReturnValue([feat1, feat2])
      spatialNavigate.mockReturnValue(0)
      expect(nav.highlightNextLabel('ArrowRight')).toContain('City2')

      // clearHighlightedLabel removes layer
      map.getLayer.mockReturnValue(true)
      nav.clearHighlightedLabel()
      expect(map.removeLayer).toHaveBeenCalledWith('highlight-s2')
    })

    test('initLabelSource skips addSource when source exists; MAP_SET_STYLE triggers re-init', () => {
      map.getSource.mockReset().mockReturnValue({ setData: jest.fn() })  // source always exists
      const eventBus = { on: jest.fn() }
      createMapLabelNavigator(map, 'light', { MAP_SET_STYLE: 'set-style' }, eventBus)
      expect(map.addSource).not.toHaveBeenCalled()

      // Fire MAP_SET_STYLE → styledata → idle → setLineCenterPlacement + initLabelSource
      const styleHandler = eventBus.on.mock.calls[0][1]
      styleHandler({ mapColorScheme: 'dark' })
      const styleDataHandler = map.once.mock.calls.find(([e]) => e === 'styledata')[1]
      styleDataHandler()
      map.setLayoutProperty.mockClear()
      const idleHandler = map.once.mock.calls.find(([e]) => e === 'idle')[1]
      idleHandler()
      expect(map.setLayoutProperty).toHaveBeenCalledWith('s1', 'symbol-placement', 'line-center')
    })
  })
})
