import { fetchGeoJSON } from './fetchGeoJSON.js'
import { getBboxArray, bboxContains, expandBbox, bboxIntersects, getGeometryBbox } from '../utils/bbox.js'
import { debounce } from '../utils/debounce.js'

const DEBOUNCE_DELAY = 200
const EVICTION_THRESHOLD = 1.2 // Trigger eviction at 120% of maxFeatures

/**
 * Convert features Map to FeatureCollection
 */
const toFeatureCollection = (features) => ({
  type: 'FeatureCollection',
  features: Array.from(features.values()).map(entry => entry.feature)
})

/**
 * Get feature ID from a feature
 */
const getFeatureId = (feature, idProperty) => {
  if (idProperty) {
    return feature.properties?.[idProperty] ?? feature.id
  }
  return feature.id
}

/**
 * Evict features that are outside the current viewport
 * Uses "least recently visible" strategy - evicts features furthest from viewport first
 * @returns {Array} The IDs of the evicted features
 */
const evictIfNeeded = (features, currentBbox, maxFeatures) => {
  const evicted = []
  if (!maxFeatures || features.size <= maxFeatures * EVICTION_THRESHOLD) {
    return evicted
  }

  const targetSize = maxFeatures

  // Partition features: in-viewport vs out-of-viewport
  const inView = []
  const outOfView = []

  for (const [id, data] of features) {
    if (bboxIntersects(data.bbox, currentBbox)) {
      inView.push(id)
    } else {
      outOfView.push({ id, lastSeenAt: data.lastSeenAt })
    }
  }

  // Sort out-of-view by last seen time (least recently seen first)
  outOfView.sort((a, b) => a.lastSeenAt - b.lastSeenAt)

  // Evict least-recently-seen out-of-view features until under target
  const toEvict = features.size - targetSize
  for (let i = 0; i < toEvict && i < outOfView.length; i++) {
    features.delete(outOfView[i].id)
    evicted.push(outOfView[i].id)
  }

  // If still over target (viewport has too many), evict least recently seen in-view
  if (features.size > targetSize) {
    const remaining = features.size - targetSize
    const inViewSorted = inView
      .map(id => ({ id, lastSeenAt: features.get(id).lastSeenAt }))
      .sort((a, b) => a.lastSeenAt - b.lastSeenAt)

    for (let i = 0; i < remaining && i < inViewSorted.length; i++) {
      features.delete(inViewSorted[i].id)
      evicted.push(inViewSorted[i].id)
    }
  }
  return evicted
}

/**
 * Merge freshly fetched GeoJSON features into the cache, deduplicating by ID. A feature that's
 * already held keeps its cached copy, with lastSeenAt refreshed (refresh() reloads changed data).
 * @returns {Array} The features that weren't held before
 */
const mergeFetchedFeatures = (features, data, idProperty) => {
  const now = Date.now()
  const added = []
  data.features.forEach(feature => {
    const id = getFeatureId(feature, idProperty)
    if (id == null) {
      console.warn('Feature missing ID, skipping:', feature)
      return
    }
    const cached = features.get(id)
    if (cached) {
      cached.lastSeenAt = now
      return
    }
    features.set(id, {
      feature,
      bbox: getGeometryBbox(feature.geometry),
      lastSeenAt: now
    })
    added.push(feature)
  })
  return added
}

/**
 * Pass a fetch's changes to the map. With an idProperty to remove features by, only the features
 * added and removed are passed, and nothing when neither; without one, or for the first fetch
 * after refresh() emptied the cache but not the map, the whole cache is.
 */
const pushChanges = (state, { dynamicGeoJSON, onUpdate, onChange }, added, evicted) => {
  const { id, idProperty } = dynamicGeoJSON
  if (!idProperty || state.replaceOnNextFetch) {
    state.replaceOnNextFetch = false
    onUpdate(id, toFeatureCollection(state.features))
    return
  }
  // A feature added and evicted by the same fetch never reaches the map
  const addedIds = new Set(added.map(feature => getFeatureId(feature, idProperty)))
  const add = added.filter(feature => state.features.has(getFeatureId(feature, idProperty)))
  const remove = evicted.filter(featureId => !addedIds.has(featureId))
  if (add.length || remove.length) {
    onChange(id, { add, remove })
  }
}

/**
 * Fetch data for the current viewport and merge it into the feature cache.
 * Mutates state.fetchedBbox / state.currentController as a side effect.
 */
const fetchViewportData = async (state, { mapProvider, dynamicGeoJSON, onUpdate, onChange }) => {
  const { url: baseUrl, idProperty, transformRequest, maxFeatures, minZoom = 0 } = dynamicGeoJSON

  const zoom = mapProvider.getZoom()
  if (zoom < minZoom) {
    return
  }

  const currentBbox = getBboxArray(mapProvider)

  // Skip if current viewport is already covered
  if (state.fetchedBbox && bboxContains(state.fetchedBbox, currentBbox)) {
    return
  }

  // Abort any in-flight request — new viewport takes priority
  if (state.currentController) {
    state.currentController.abort()
  }
  state.currentController = new AbortController()

  try {
    const context = { bbox: currentBbox, zoom }
    const data = await fetchGeoJSON(baseUrl, context, transformRequest, state.currentController.signal)

    const added = mergeFetchedFeatures(state.features, data, idProperty)

    // Expand tracked bbox
    state.fetchedBbox = expandBbox(state.fetchedBbox, currentBbox)

    // Evict if over limit; if features were removed, fetchedBbox no longer
    // covers those regions — reset to current viewport to force re-fetch on return
    const evicted = evictIfNeeded(state.features, currentBbox, maxFeatures)
    if (evicted.length) {
      state.fetchedBbox = currentBbox
    }

    pushChanges(state, { dynamicGeoJSON, onUpdate, onChange }, added, evicted)
  } catch (error) {
    if (error.name === 'AbortError') {
      return
    }
    console.error(`Failed to fetch dynamic GeoJSON for ${dynamicGeoJSON.id}:`, error)
  }
}

// mapbox-gl has on()/off(), but OL's Observable only has on()/once()/un() — duck-type the
// removal call rather than adding a map-provider abstraction just for this one method.
const offMoveEnd = (map, handler) => (map.off || map.un).call(map, 'moveend', handler)

/**
 * Create a dynamic GeoJSON source that fetches data based on viewport
 * @param {Object} options
 * @param {Object} options.dynamicGeoJSON - dynamicGeoJSON config from the registry dataset
 * @param {Object} options.mapProvider - Map provider instance (e.g. MapLibreProvider/OpenLayersProvider)
 * @param {Function} options.onUpdate - Called with the dataset ID and a FeatureCollection of every
 *   held feature, when the map's data should be replaced
 * @param {Function} options.onChange - Called with the dataset ID and `{ add, remove }` (features,
 *   and the IDs of features) after a fetch, when the dataset has an idProperty
 * @returns {Object} { destroy, refresh, reapply }
 */
export const createDynamicSource = ({ dynamicGeoJSON, mapProvider, onUpdate, onChange }) => {
  // state.features: id → { feature, bbox, lastSeenAt }
  const state = {
    features: new Map(),
    fetchedBbox: null,
    currentController: null,
    replaceOnNextFetch: false
  }

  const fetchData = () => fetchViewportData(state, { mapProvider, dynamicGeoJSON, onUpdate, onChange })

  // Debounced fetch handler
  const debouncedFetch = debounce(fetchData, DEBOUNCE_DELAY)

  // Listen for map movements
  const handleMoveEnd = () => {
    debouncedFetch()
  }

  mapProvider.map.on('moveend', handleMoveEnd)

  // Initial fetch
  fetchData() // NOSONAR: Not changing for now as used in production

  return {
    /**
     * Clean up event listeners and cancel any in-flight request
     */
    destroy () {
      offMoveEnd(mapProvider.map, handleMoveEnd)
      debouncedFetch.cancel()
      if (state.currentController) {
        state.currentController.abort()
      }
    },

    /**
     * Force refresh - clear cache and fetch current viewport
     */
    refresh () {
      state.features.clear()
      state.fetchedBbox = null
      state.replaceOnNextFetch = true
      fetchData() // NOSONAR: Not changing for now as used in production
    },

    /**
     * Re-push cached features to the source (e.g., after style change)
     */
    reapply () {
      if (state.features.size > 0) {
        onUpdate(dynamicGeoJSON.id, toFeatureCollection(state.features))
      }
    }
  }
}
