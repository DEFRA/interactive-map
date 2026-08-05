import { DisabledMode } from './disabledMode.js'

describe('DisabledMode', () => {
  test('onSetup returns an empty state', () => {
    expect(DisabledMode.onSetup()).toEqual({})
  })

  test('interaction handlers are disabled (return false to block selection/drag/keys)', () => {
    expect(DisabledMode.onClick()).toBe(false)
    expect(DisabledMode.onKeyUp()).toBe(false)
    expect(DisabledMode.onDrag()).toBe(false)
  })

  test('toDisplayFeatures marks the feature inactive and still displays it', () => {
    const display = jest.fn()
    const geojson = { properties: {} }
    DisabledMode.toDisplayFeatures({}, geojson, display)
    expect(geojson.properties.active).toBe('false')
    expect(display).toHaveBeenCalledWith(geojson)
  })
})
