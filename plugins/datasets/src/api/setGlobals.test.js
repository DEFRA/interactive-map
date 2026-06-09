import { setGlobals } from './setGlobals.js'
import { logger } from '../../../../../src/services/logger.js'

jest.mock('../../../../../src/services/logger.js', () => ({
  logger: { warn: jest.fn() }
}))

describe('setGlobals', () => {
  const dispatch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('dispatches SET_GLOBAL_STATE with opacityMode when valid value is provided', () => {
    setGlobals({ pluginState: { dispatch } }, { opacityMode: 'dataset' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_GLOBAL_STATE',
      payload: { opacityMode: 'dataset' }
    })
  })

  it.each(['dataset', 'global', 'multiply'])('accepts valid opacityMode: %s', (opacityMode) => {
    setGlobals({ pluginState: { dispatch } }, { opacityMode })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_GLOBAL_STATE',
      payload: { opacityMode }
    })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('warns and does not dispatch when opacityMode is invalid', () => {
    setGlobals({ pluginState: { dispatch } }, { opacityMode: 'invalid' })

    expect(logger.warn).toHaveBeenCalledWith(
      "Ignoring invalid opacityMode: invalid. Must be one of 'dataset', 'global' or 'multiply'."
    )
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('warns and does not dispatch when no valid values are provided', () => {
    setGlobals({ pluginState: { dispatch } }, {})

    expect(logger.warn).toHaveBeenCalledWith(
      'setGlobals: requires a valid value for opacityMode to be set'
    )
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('warns about invalid opacityMode and then warns no valid values set', () => {
    setGlobals({ pluginState: { dispatch } }, { opacityMode: 'bad' })

    expect(logger.warn).toHaveBeenCalledWith(
      "Ignoring invalid opacityMode: bad. Must be one of 'dataset', 'global' or 'multiply'."
    )
    expect(logger.warn).toHaveBeenCalledWith(
      'setGlobals: requires a valid value for opacityMode to be set'
    )
    expect(dispatch).not.toHaveBeenCalled()
  })
})
