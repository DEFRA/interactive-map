import { buildStylesMap } from './buildStylesMap.js'
import { DEFAULTS } from '../defaults.js'
import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'

jest.mock('../../../../src/utils/getValueForStyle.js', () => ({
  getValueForStyle: jest.fn((value) => value)
}))

describe('buildStylesMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty object when mapStyle is falsy or dataLayers empty', () => {
    expect(buildStylesMap([{ layerId: 'test' }], null)).toEqual({})
    expect(buildStylesMap([{ layerId: 'test' }], undefined)).toEqual({})
    expect(buildStylesMap([], { id: 'default' })).toEqual({})
  })

  it('builds correct stylesMap with defaults and layer overrides', () => {
    const dataLayers = [
      { layerId: 'custom1', selectedStroke: 'red', selectedFill: 'blue', selectedStrokeWidth: 5 },
      { layerId: 'custom2' } // uses defaults
    ]
    const mapStyle = { id: 'default-style' }

    const result = buildStylesMap(dataLayers, mapStyle)

    // Layer-specific values
    expect(result.custom1).toEqual({
      stroke: 'red',
      fill: 'blue',
      strokeWidth: 5
    })

    // Default fallback values
    expect(result.custom2.stroke).toBe('#0b0c0c')
    expect(result.custom2.fill).toBe('transparent')
    expect(result.custom2.strokeWidth).toBe(DEFAULTS.selectedStrokeWidth)
  })

  it('uses mapStyle.selectedColor as default stroke when no layer override', () => {
    const dataLayers = [{ layerId: 'layer1' }]
    const mapStyle = { id: 'test', selectedColor: '#336699' }
    const result = buildStylesMap(dataLayers, mapStyle)
    expect(result.layer1.stroke).toBe('#336699')
    expect(result.layer1.fill).toBe('transparent')
  })

  it('uses scheme default when mapStyle has no selectedColor', () => {
    const dataLayers = [{ layerId: 'layer1' }]
    expect(buildStylesMap(dataLayers, { id: 'light' }).layer1.stroke).toBe('#0b0c0c')
    expect(buildStylesMap(dataLayers, { id: 'dark', mapColorScheme: 'dark' }).layer1.stroke).toBe('#ffffff')
  })

  it('calls getValueForStyle for stroke and fill with mapStyle.id', () => {
    const dataLayers = [
      { layerId: 'layer1', selectedStroke: 'strokeVal', selectedFill: 'fillVal' }
    ]
    const mapStyle = { id: 'mapStyleId' }

    buildStylesMap(dataLayers, mapStyle)

    expect(getValueForStyle).toHaveBeenCalledWith('strokeVal', 'mapStyleId')
    expect(getValueForStyle).toHaveBeenCalledWith('fillVal', 'mapStyleId')

    // Ensure strokeWidth is not passed to getValueForStyle
    const numberCalls = getValueForStyle.mock.calls.filter(call => typeof call[0] === 'number')
    expect(numberCalls).toHaveLength(0)
  })
})
