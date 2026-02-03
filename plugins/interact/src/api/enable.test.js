import { enable } from './enable.js'
import { DEFAULTS } from '../defaults.js'

describe('enable', () => {
  let dispatch

  beforeEach(() => {
    dispatch = jest.fn()
  })

  it('dispatches ENABLE with merged payload correctly', () => {
    const pluginConfig = { markerColor: 'blue' }
    const options = { interactionMode: 'select', markerColor: 'green', dataLayers: [{ layerId: 'test' }] }

    enable({ pluginState: { dispatch }, pluginConfig }, options)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({
        interactionMode: 'select',   // options override DEFAULTS
        multiSelect: DEFAULTS.multiSelect, // default preserved
        markerColor: 'green',        // options override pluginConfig
        dataLayers: [{ layerId: 'test' }] // options passed
      })
    })
  })

  it('handles empty or undefined options', () => {
    const pluginConfig = { markerColor: 'blue' }

    enable({ pluginState: { dispatch }, pluginConfig }, {})
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({ ...DEFAULTS, ...pluginConfig })
    })

    dispatch.mockClear()

    enable({ pluginState: { dispatch }, pluginConfig }, undefined)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({ ...DEFAULTS, ...pluginConfig })
    })
  })
})
