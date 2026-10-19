import { enable } from './enable.js'
import { DEFAULTS } from '../defaults.js'

describe('enable', () => {
  let dispatch

  beforeEach(() => {
    dispatch = jest.fn()
  })

  it('dispatches ENABLE with merged payload correctly', () => {
    const pluginConfig = { marker: { symbol: 'pin', backgroundColor: 'blue' } }
    const options = { interactionModes: ['selectFeature'], marker: { symbol: 'circle', backgroundColor: 'green' }, layers: [{ layerId: 'test' }] }

    enable({ pluginState: { dispatch }, pluginConfig }, options)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({
        interactionModes: ['selectFeature'],
        multiSelect: DEFAULTS.multiSelect,
        marker: { symbol: 'circle', backgroundColor: 'green' },
        layers: [{ layerId: 'test' }]
      })
    })
  })

  it('takes touchTarget from the plugin config, overridden per session by enable options', () => {
    const touchTargetOf = () => dispatch.mock.calls.at(-1)[0].payload.touchTarget

    enable({ pluginState: { dispatch }, pluginConfig: {} })
    expect(touchTargetOf()).toBe(true)

    enable({ pluginState: { dispatch }, pluginConfig: { touchTarget: false } })
    expect(touchTargetOf()).toBe(false)

    enable({ pluginState: { dispatch }, pluginConfig: { touchTarget: false } }, { touchTarget: true })
    expect(touchTargetOf()).toBe(true)
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
