import { enable } from './enable.js'
import { DEFAULTS } from '../defaults.js'

describe('enable', () => {
  let mockDispatch

  beforeEach(() => {
    mockDispatch = jest.fn()
  })

  it('dispatches ENABLE action', () => {
    const params = {
      pluginState: { dispatch: mockDispatch },
      pluginConfig: {}
    }

    enable(params, {})

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ENABLE' })
    )
  })

  it('merges DEFAULTS into payload', () => {
    const params = {
      pluginState: { dispatch: mockDispatch },
      pluginConfig: {}
    }

    enable(params, {})

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({
        interactionMode: DEFAULTS.interactionMode,
        multiSelect: DEFAULTS.multiSelect,
        markerColor: DEFAULTS.markerColor
      })
    })
  })

  it('merges pluginConfig with options', () => {
    const params = {
      pluginState: { dispatch: mockDispatch },
      pluginConfig: { markerColor: 'blue' }
    }

    enable(params, {})

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({
        markerColor: 'blue'
      })
    })
  })

  it('options override DEFAULTS', () => {
    const params = {
      pluginState: { dispatch: mockDispatch },
      pluginConfig: {}
    }

    enable(params, { interactionMode: 'select' })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({
        interactionMode: 'select'
      })
    })
  })

  it('options override pluginConfig', () => {
    const params = {
      pluginState: { dispatch: mockDispatch },
      pluginConfig: { markerColor: 'blue' }
    }

    enable(params, { markerColor: 'green' })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({
        markerColor: 'green'
      })
    })
  })

  it('handles empty options', () => {
    const params = {
      pluginState: { dispatch: mockDispatch },
      pluginConfig: {}
    }

    enable(params, {})

    expect(mockDispatch).toHaveBeenCalledTimes(1)
  })

  it('handles undefined options', () => {
    const params = {
      pluginState: { dispatch: mockDispatch },
      pluginConfig: {}
    }

    enable(params, undefined)

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining(DEFAULTS)
    })
  })

  it('passes dataLayers option', () => {
    const params = {
      pluginState: { dispatch: mockDispatch },
      pluginConfig: {}
    }
    const dataLayers = [{ layerId: 'test' }]

    enable(params, { dataLayers })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ENABLE',
      payload: expect.objectContaining({
        dataLayers
      })
    })
  })
})
