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

  it('returns empty object when mapStyle is null', () => {
    const result = buildStylesMap([{ layerId: 'test' }], null)

    expect(result).toEqual({})
  })

  it('returns empty object when mapStyle is undefined', () => {
    const result = buildStylesMap([{ layerId: 'test' }], undefined)

    expect(result).toEqual({})
  })

  it('builds map keyed by layerId', () => {
    const dataLayers = [
      { layerId: 'layer1' },
      { layerId: 'layer2' }
    ]
    const mapStyle = { id: 'default' }

    const result = buildStylesMap(dataLayers, mapStyle)

    expect(Object.keys(result)).toEqual(['layer1', 'layer2'])
  })

  describe('style values', () => {
    it('uses layer selectedStroke if provided', () => {
      const dataLayers = [{ layerId: 'test', selectedStroke: 'blue' }]
      const mapStyle = { id: 'default' }

      const result = buildStylesMap(dataLayers, mapStyle)

      expect(result.test.stroke).toBe('blue')
    })

    it('uses DEFAULTS.selectedStroke as fallback', () => {
      const dataLayers = [{ layerId: 'test' }]
      const mapStyle = { id: 'default' }

      const result = buildStylesMap(dataLayers, mapStyle)

      expect(result.test.stroke).toBe(DEFAULTS.selectedStroke)
    })

    it('uses layer selectedFill if provided', () => {
      const dataLayers = [{ layerId: 'test', selectedFill: 'rgba(0,0,255,0.5)' }]
      const mapStyle = { id: 'default' }

      const result = buildStylesMap(dataLayers, mapStyle)

      expect(result.test.fill).toBe('rgba(0,0,255,0.5)')
    })

    it('uses DEFAULTS.selectedFill as fallback', () => {
      const dataLayers = [{ layerId: 'test' }]
      const mapStyle = { id: 'default' }

      const result = buildStylesMap(dataLayers, mapStyle)

      expect(result.test.fill).toBe(DEFAULTS.selectedFill)
    })

    it('uses layer selectedStrokeWidth if provided', () => {
      const dataLayers = [{ layerId: 'test', selectedStrokeWidth: 5 }]
      const mapStyle = { id: 'default' }

      const result = buildStylesMap(dataLayers, mapStyle)

      expect(result.test.strokeWidth).toBe(5)
    })

    it('uses DEFAULTS.selectedStrokeWidth as fallback', () => {
      const dataLayers = [{ layerId: 'test' }]
      const mapStyle = { id: 'default' }

      const result = buildStylesMap(dataLayers, mapStyle)

      expect(result.test.strokeWidth).toBe(DEFAULTS.selectedStrokeWidth)
    })
  })

  describe('getValueForStyle integration', () => {
    it('calls getValueForStyle for stroke', () => {
      const dataLayers = [{ layerId: 'test', selectedStroke: 'red' }]
      const mapStyle = { id: 'satellite' }

      buildStylesMap(dataLayers, mapStyle)

      expect(getValueForStyle).toHaveBeenCalledWith('red', 'satellite')
    })

    it('calls getValueForStyle for fill', () => {
      const dataLayers = [{ layerId: 'test', selectedFill: 'rgba(0,0,0,0.1)' }]
      const mapStyle = { id: 'satellite' }

      buildStylesMap(dataLayers, mapStyle)

      expect(getValueForStyle).toHaveBeenCalledWith('rgba(0,0,0,0.1)', 'satellite')
    })

    it('passes mapStyle.id to getValueForStyle', () => {
      const dataLayers = [{ layerId: 'test' }]
      const mapStyle = { id: 'custom-style' }

      buildStylesMap(dataLayers, mapStyle)

      expect(getValueForStyle).toHaveBeenCalledWith(
        expect.anything(),
        'custom-style'
      )
    })

    it('does not call getValueForStyle for strokeWidth', () => {
      const dataLayers = [{ layerId: 'test', selectedStrokeWidth: 3 }]
      const mapStyle = { id: 'default' }

      buildStylesMap(dataLayers, mapStyle)

      // Should only be called for stroke and fill, not strokeWidth
      const calls = getValueForStyle.mock.calls
      const strokeWidthCalls = calls.filter(call => typeof call[0] === 'number')
      expect(strokeWidthCalls).toHaveLength(0)
    })
  })

  describe('multiple layers', () => {
    it('creates entry for each layer', () => {
      const dataLayers = [
        { layerId: 'a', selectedStroke: 'red' },
        { layerId: 'b', selectedStroke: 'blue' },
        { layerId: 'c', selectedStroke: 'green' }
      ]
      const mapStyle = { id: 'default' }

      const result = buildStylesMap(dataLayers, mapStyle)

      expect(Object.keys(result)).toHaveLength(3)
      expect(result.a.stroke).toBe('red')
      expect(result.b.stroke).toBe('blue')
      expect(result.c.stroke).toBe('green')
    })

    it('handles layers with mixed custom/default styles', () => {
      const dataLayers = [
        { layerId: 'custom', selectedStroke: 'purple', selectedFill: 'yellow' },
        { layerId: 'defaults' }
      ]
      const mapStyle = { id: 'default' }

      const result = buildStylesMap(dataLayers, mapStyle)

      expect(result.custom.stroke).toBe('purple')
      expect(result.custom.fill).toBe('yellow')
      expect(result.defaults.stroke).toBe(DEFAULTS.selectedStroke)
      expect(result.defaults.fill).toBe(DEFAULTS.selectedFill)
    })
  })

  describe('empty dataLayers', () => {
    it('returns empty object for empty array', () => {
      const result = buildStylesMap([], { id: 'default' })

      expect(result).toEqual({})
    })
  })
})
