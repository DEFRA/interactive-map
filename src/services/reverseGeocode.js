let reverseGeocodeFn = null

export function createReverseGeocode ({ url, transformRequest, load }, crs) {
  reverseGeocodeFn = async (zoom, coord) => {
    const providerFn = await load()
    return providerFn(url, transformRequest, crs, zoom, coord)
  }
}

export function hasReverseGeocode () {
  return reverseGeocodeFn !== null
}

export function reverseGeocode (zoom, coord) {
  if (!reverseGeocodeFn) {
    throw new Error('ReverseGeocode not initialised')
  }
  return reverseGeocodeFn(zoom, coord)
}
