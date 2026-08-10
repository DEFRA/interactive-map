import defaults from './defaults.js'

export const mergeConfig = (userConfig = {}) => {
  const { mapViewParamKey, ...restUser } = userConfig

  const config = {
    ...defaults,
    ...restUser
  }

  if (mapViewParamKey !== undefined) {
    console.warn('[InteractiveMap] mapViewParamKey is deprecated — use mapViewQueryParam instead.')
    config.mapViewQueryParam = mapViewParamKey
  }

  // mapOnly has no launcher button or history entry to exit back to, so an exit
  // button never makes sense there regardless of hasExitButton.
  if (config.behaviour === 'mapOnly' && config.hasExitButton) {
    console.warn('[InteractiveMap] hasExitButton has no effect when behaviour is \'mapOnly\' — there is nothing to exit to.')
    config.hasExitButton = false
  }

  return config
}
