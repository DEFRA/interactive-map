import { enable } from './enable.js'
import { DEFAULTS } from '../defaults.js'

describe('enable', () => {
  let dispatch

  beforeEach(() => {
    dispatch = jest.fn()
  })

  it('dispatches ENABLE with merged payload correctly', () => {
    const pluginConfig = { marker: { symbol: 'pin', backgroundColor: 'blue' } }
    const options = { interactionMode: 'select', marker: { symbol: 'circle', backgroundColor: 'green' }, dataLayers: [{ layerId: 'test' }] }

    enable({ pluginState: { dispatch }, pluginConfig }, options)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({
        interactionMode: 'select',
        multiSelect: DEFAULTS.multiSelect,
        marker: { symbol: 'circle', backgroundColor: 'green' },
        dataLayers: [{ layerId: 'test' }]
      })
    })
  })

  it('handles empty or undefined options', () => {
    const pluginConfig = { marker: { symbol: 'pin', backgroundColor: 'blue' } }

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
