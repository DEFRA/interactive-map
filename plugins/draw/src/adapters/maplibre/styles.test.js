import { createDrawStyles, updateDrawStyles } from './styles.js'
import { COLORS, SIZES } from './defaults.js'
import { getValueForStyle } from '../../utils/getValueForStyle.js'

const findLayer = (layers, id) => layers.find((l) => l.id === id)

describe('createDrawStyles', () => {
  const mapStyle = { id: 'outdoor', mapColorScheme: 'light' }

  test('returns every draw layer in order', () => {
    const layers = createDrawStyles(mapStyle)
    expect(layers.map((l) => l.id)).toEqual([
      'fill-inactive', 'fill-active', 'stroke-active', 'stroke-active-invalid', 'stroke-inactive',
      'stroke-invalid-splitter', 'stroke-valid-splitter', 'stroke-preview-line',
      'midpoint', 'midpoint-halo', 'midpoint-active',
      'vertex', 'vertex-halo', 'vertex-active', 'circle', 'touch-vertex-indicator'
    ])
  })

  test('the invalid stroke layer is a hidden dashed line matching the active shape', () => {
    const layers = createDrawStyles(mapStyle)
    const invalid = findLayer(layers, 'stroke-active-invalid')
    expect(invalid.layout.visibility).toBe('none') // hidden until the shape is invalid
    expect(invalid.paint['line-dasharray']).toEqual([0.2, 2])
    expect(invalid.paint['line-color']).toBe(getValueForStyle(COLORS.invalidStroke, 'light'))
    expect(invalid.filter).toEqual(findLayer(layers, 'stroke-active').filter)
  })

  test('resolves light-scheme colours', () => {
    const layers = createDrawStyles({ id: 'outdoor', mapColorScheme: 'light' })
    expect(findLayer(layers, 'stroke-active').paint['line-color']).toBe(getValueForStyle(COLORS.editStroke, 'light'))
    expect(findLayer(layers, 'fill-active').paint['fill-color']).toBe(getValueForStyle(COLORS.editFill, 'light'))
    expect(findLayer(layers, 'vertex').paint['circle-color']).toBe(getValueForStyle(COLORS.editVertex, 'light'))
    expect(findLayer(layers, 'midpoint').paint['circle-color']).toBe(getValueForStyle(COLORS.editMidpoint, 'light'))
  })

  test('resolves dark-scheme colours', () => {
    const layers = createDrawStyles({ id: 'night', mapColorScheme: 'dark' })
    expect(findLayer(layers, 'stroke-active').paint['line-color']).toBe(getValueForStyle(COLORS.editStroke, 'dark'))
    expect(findLayer(layers, 'vertex-halo').paint['circle-color']).toBe(getValueForStyle(COLORS.editHalo, 'dark'))
    expect(findLayer(layers, 'vertex-halo').paint['circle-stroke-color']).toBe(getValueForStyle(COLORS.editActive, 'dark'))
  })

  test('defaults to the light scheme when none is provided', () => {
    const layers = createDrawStyles({ id: 'outdoor' })
    expect(findLayer(layers, 'stroke-active').paint['line-color']).toBe(getValueForStyle(COLORS.editStroke, 'light'))
  })

  test('applies the configured sizes', () => {
    const layers = createDrawStyles(mapStyle)
    expect(findLayer(layers, 'vertex').paint['circle-radius']).toBe(SIZES.vertexRadius)
    expect(findLayer(layers, 'vertex-halo').paint['circle-radius']).toBe(SIZES.vertexHaloRadius)
    expect(findLayer(layers, 'midpoint').paint['circle-radius']).toBe(SIZES.midpointRadius)
    expect(findLayer(layers, 'midpoint-halo').paint['circle-radius']).toBe(SIZES.midpointHaloRadius)
    expect(findLayer(layers, 'stroke-inactive').paint['line-width']).toBe(SIZES.strokeWidth)
  })

  test('builds per-style user-property coalesce expressions for inactive fill and stroke', () => {
    const layers = createDrawStyles({ id: 'outdoor', mapColorScheme: 'light' })

    expect(findLayer(layers, 'fill-inactive').paint['fill-color']).toEqual([
      'coalesce',
      ['get', 'user_fillOutdoor'],
      ['get', 'user_fill'],
      COLORS.shapeFill
    ])
    expect(findLayer(layers, 'stroke-inactive').paint['line-color']).toEqual([
      'coalesce',
      ['get', 'user_strokeOutdoor'],
      ['get', 'user_stroke'],
      COLORS.shapeStroke
    ])
  })

  test('capitalises the style id in the user-property key', () => {
    const layers = createDrawStyles({ id: 'satellite', mapColorScheme: 'light' })
    expect(findLayer(layers, 'fill-inactive').paint['fill-color'][1]).toEqual(['get', 'user_fillSatellite'])
  })

  test('colours the splitter and touch-indicator layers', () => {
    const layers = createDrawStyles(mapStyle)
    expect(findLayer(layers, 'stroke-invalid-splitter').paint['line-color']).toBe(getValueForStyle(COLORS.splitInvalid, 'light'))
    expect(findLayer(layers, 'stroke-valid-splitter').paint['line-color']).toBe(getValueForStyle(COLORS.splitValid, 'light'))
    expect(findLayer(layers, 'touch-vertex-indicator').paint['circle-color']).toBe('#3bb2d0')
  })
})

describe('updateDrawStyles', () => {
  const mapStyle = { id: 'outdoor', mapColorScheme: 'light' }

  test('applies paint properties to both the cold and hot copies of each layer', () => {
    const map = { getLayer: jest.fn(() => true), setPaintProperty: jest.fn() }

    updateDrawStyles(map, mapStyle)

    expect(map.setPaintProperty).toHaveBeenCalledWith('fill-inactive.cold', 'fill-color', expect.anything())
    expect(map.setPaintProperty).toHaveBeenCalledWith('fill-inactive.hot', 'fill-color', expect.anything())
    expect(map.setPaintProperty).toHaveBeenCalledWith('vertex.cold', 'circle-radius', SIZES.vertexRadius)
    expect(map.setPaintProperty).toHaveBeenCalledWith('vertex.hot', 'circle-color', expect.anything())
  })

  test('skips layers that are not present on the map', () => {
    const map = { getLayer: jest.fn(() => false), setPaintProperty: jest.fn() }

    updateDrawStyles(map, mapStyle)

    expect(map.setPaintProperty).not.toHaveBeenCalled()
  })

  test('updates only the cold layer when the hot copy is absent', () => {
    const map = {
      getLayer: jest.fn((id) => id.endsWith('.cold')),
      setPaintProperty: jest.fn()
    }

    updateDrawStyles(map, mapStyle)

    const targets = map.setPaintProperty.mock.calls.map(([id]) => id)
    expect(targets.length).toBeGreaterThan(0)
    expect(targets.every((id) => id.endsWith('.cold'))).toBe(true)
    expect(targets.some((id) => id.endsWith('.hot'))).toBe(false)
  })
})
