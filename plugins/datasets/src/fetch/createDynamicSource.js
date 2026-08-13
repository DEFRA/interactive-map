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
 */
const evictIfNeeded = (features, currentBbox, maxFeatures) => {
  if (!maxFeatures || features.size <= maxFeatures * EVICTION_THRESHOLD) {
    return
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
  }

  // If still over target (viewport has too many), evict least recently seen in-view
  if (features.size > targetSize) {
    const remaining = features.size - targetSize
    const inViewSorted = inView
      .map(id => ({ id, lastSeenAt: features.get(id).lastSeenAt }))
      .sort((a, b) => a.lastSeenAt - b.lastSeenAt)

    for (let i = 0; i < remaining && i < inViewSorted.length; i++) {
      features.delete(inViewSorted[i].id)
    }
  }
}

/**
 * Merge freshly fetched GeoJSON features into the cache, deduplicating by ID
 * and refreshing lastSeenAt for features that were re-fetched
 */
const mergeFetchedFeatures = (features, data, idProperty) => {
  const now = Date.now()
  data.features.forEach(feature => {
    const id = getFeatureId(feature, idProperty)
    if (id == null) {
      console.warn('Feature missing ID, skipping:', feature)
      return
    }

    features.set(id, {
      feature,
      bbox: getGeometryBbox(feature.geometry),
      lastSeenAt: now
    })
  })
}

/**
 * Fetch data for the current viewport and merge it into the feature cache.
 * Mutates state.fetchedBbox / state.currentController as a side effect.
 */
const fetchViewportData = async (state, { map, dynamicGeoJSON, onUpdate }) => {
  const { url: baseUrl, idProperty, transformRequest, maxFeatures, minZoom = 0 } = dynamicGeoJSON

  const zoom = map.getZoom()
  if (zoom < minZoom) {
    return
  }

  const currentBbox = getBboxArray(map)

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

    mergeFetchedFeatures(state.features, data, idProperty)

    // Expand tracked bbox
    state.fetchedBbox = expandBbox(state.fetchedBbox, currentBbox)

    // Evict if over limit; if features were removed, fetchedBbox no longer
    // covers those regions — reset to current viewport to force re-fetch on return
    const sizeBeforeEviction = state.features.size
    evictIfNeeded(state.features, currentBbox, maxFeatures)
    if (state.features.size < sizeBeforeEviction) {
      state.fetchedBbox = currentBbox
    }

    // Update map source
    onUpdate(dynamicGeoJSON.id, toFeatureCollection(state.features))
  } catch (error) {
    if (error.name === 'AbortError') {
      return
    }
    console.error(`Failed to fetch dynamic GeoJSON for ${dynamicGeoJSON.id}:`, error)
  }
}

/**
 * Create a dynamic GeoJSON source that fetches data based on viewport
 * @param {Object} options
 * @param {Object} options.dynamicGeoJSON - dynamicGeoJSON config from the registry dataset
 * @param {Object} options.map - Map instance
 * @param {Function} options.onUpdate - Callback when source data should be updated
 * @returns {Object} { destroy, clear, refresh, getFeatureCount, reapply }
 */
export const createDynamicSource = ({ dynamicGeoJSON, map, onUpdate }) => {
  // state.features: id → { feature, bbox, lastSeenAt }
  const state = {
    features: new Map(),
    fetchedBbox: null,
    currentController: null
  }

  const fetchData = () => fetchViewportData(state, { map, dynamicGeoJSON, onUpdate })

  // Debounced fetch handler
  const debouncedFetch = debounce(fetchData, DEBOUNCE_DELAY)

  // Listen for map movements
  const handleMoveEnd = () => {
    debouncedFetch()
  }

  map.on('moveend', handleMoveEnd)

  // Initial fetch
  fetchData()

  return {
    /**
     * Clean up event listeners and cancel any in-flight request
     */
    destroy () {
      map.off('moveend', handleMoveEnd)
      debouncedFetch.cancel()
      if (state.currentController) {
        state.currentController.abort()
      }
    },

    /**
     * Clear all cached features and reset fetch tracking
     */
    clear () {
      state.features.clear()
      state.fetchedBbox = null
      onUpdate(dynamicGeoJSON.id, { type: 'FeatureCollection', features: [] })
    },

    /**
     * Force refresh - clear cache and fetch current viewport
     */
    refresh () {
      state.features.clear()
      state.fetchedBbox = null
      fetchData()
    },

    /**
     * Get current feature count
     */
    getFeatureCount () {
      return state.features.size
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
