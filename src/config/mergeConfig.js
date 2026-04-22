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

  return config
}
