import { logger } from '../../../../src/services/logger.js'
export const setGlobals = ({ pluginState: { dispatch } }, values) => {
  const { opacityMode } = values
  const payload = {}
  let valuesSet = false
  if (opacityMode) {
    if (!['dataset', 'global', 'multiply'].includes(opacityMode)) {
      logger.warn(`Ignoring invalid opacityMode: ${opacityMode}. Must be one of 'dataset', 'global' or 'multiply'.`)
    } else {
      valuesSet = true
      payload.opacityMode = opacityMode
    }
  }

  if (valuesSet) {
    dispatch({ type: 'SET_GLOBAL_STATE', payload })
  } else {
    logger.warn('setGlobals: requires a valid value for opacityMode to be set')
  }
}
