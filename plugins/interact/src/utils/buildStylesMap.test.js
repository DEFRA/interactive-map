import { buildStylesMap } from './buildStylesMap.js'
import { THEME_COLORS } from '../../../../src/config/mapTheme.js'
import { SELECTED_STROKE_WIDTH, ACTIVE_STROKE_WIDTH } from '../../../../src/config/symbolConfig.js'
import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'

jest.mock('../../../../src/utils/getValueForStyle.js', () => ({
  getValueForStyle: jest.fn((value) => value)
}))

const CUSTOM_STROKE_WIDTH = 5

describe('buildStylesMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty object when mapStyle is falsy or dataLayers empty', () => {
    expect(buildStylesMap([{ layerId: 'test' }], null)).toEqual({})
    expect(buildStylesMap([{ layerId: 'test' }], undefined)).toEqual({})
    expect(buildStylesMap([], { id: 'default' })).toEqual({})
  })

  it('builds correct stylesMap with layer overrides', () => {
    const dataLayers = [
      { layerId: 'custom1', activeStroke: 'yellow', selectedStroke: 'red', selectedFill: 'blue', selectedStrokeWidth: CUSTOM_STROKE_WIDTH }
    ]
    const result = buildStylesMap(dataLayers, { id: 'default-style' })
    expect(result.custom1).toEqual({
      stroke: 'yellow',
      selectionStroke: 'red',
      fill: 'blue',
      strokeWidth: CUSTOM_STROKE_WIDTH,
      activeStrokeWidth: CUSTOM_STROKE_WIDTH + ACTIVE_STROKE_WIDTH
    })
  })

  it('falls back to scheme defaults when no layer or mapStyle overrides', () => {
    const dataLayers = [{ layerId: 'layer1' }]
    const result = buildStylesMap(dataLayers, { id: 'default-style' })
    expect(result.layer1.stroke).toBe(THEME_COLORS.light.activeColor)
    expect(result.layer1.selectionStroke).toBe(THEME_COLORS.light.selectedColor)
    expect(result.layer1.fill).toBe('transparent')
    expect(result.layer1.strokeWidth).toBe(SELECTED_STROKE_WIDTH)
  })

  it('uses mapStyle.activeColor and selectedColor when provided', () => {
    const dataLayers = [{ layerId: 'layer1' }]
    const mapStyle = { id: 'test', activeColor: '#00ff00', selectedColor: '#336699' }
    const result = buildStylesMap(dataLayers, mapStyle)
    expect(result.layer1.stroke).toBe('#00ff00')
    expect(result.layer1.selectionStroke).toBe('#336699')
  })

  it('uses dark scheme defaults when mapColorScheme is dark', () => {
    const dataLayers = [{ layerId: 'layer1' }]
    const result = buildStylesMap(dataLayers, { id: 'dark', mapColorScheme: 'dark' })
    expect(result.layer1.stroke).toBe(THEME_COLORS.dark.activeColor)
    expect(result.layer1.selectionStroke).toBe(THEME_COLORS.dark.selectedColor)
  })

  it('calls getValueForStyle for stroke and fill with mapStyle.id', () => {
    const dataLayers = [
      { layerId: 'layer1', activeStroke: 'strokeVal', selectedFill: 'fillVal' }
    ]
    buildStylesMap(dataLayers, { id: 'mapStyleId' })
    expect(getValueForStyle).toHaveBeenCalledWith('strokeVal', 'mapStyleId')
    expect(getValueForStyle).toHaveBeenCalledWith('fillVal', 'mapStyleId')
    const numberCalls = getValueForStyle.mock.calls.filter(call => typeof call[0] === 'number')
    expect(numberCalls).toHaveLength(0)
  })
})
