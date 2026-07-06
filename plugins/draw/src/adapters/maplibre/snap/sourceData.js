/**
 * Poll until checkFn returns truthy, then call onSuccess with the result.
 * A `null` result signals to stop polling; any other falsy value keeps polling.
 */
export function pollUntil (checkFn, onSuccess) {
  (function poll () {
    const result = checkFn()
    if (result === null) {
      return
    }
    result ? onSuccess(result) : requestAnimationFrame(poll)
  })()
}

/**
 * Patch a GeoJSON source to expose _data for MapboxSnap compatibility.
 * MapboxSnap expects source._data.features but MapLibre doesn't expose this.
 */
export function patchSourceData (source) {
  if (!source || (source._data && Array.isArray(source._data?.features))) {
    return
  }

  let dataCache = { type: 'FeatureCollection', features: [] }
  Object.defineProperty(source, '_data', {
    get: () => dataCache,
    set: (val) => {
      dataCache = (val && typeof val === 'object' && Array.isArray(val.features))
        ? val
        : { type: 'FeatureCollection', features: [] }
    },
    configurable: true
  })
}
