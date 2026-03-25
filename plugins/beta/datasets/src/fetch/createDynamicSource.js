import { fetchGeoJSON } from './fetchGeoJSON.js'
import { getBboxArray, bboxContains, expandBbox, bboxIntersects, getGeometryBbox } from '../utils/bbox.js'
import { debounce } from '../utils/debounce.js'

const DEBOUNCE_DELAY = 200
const EVICTION_THRESHOLD = 1.2 // Trigger eviction at 120% of maxFeatures

/**
 * Create a dynamic GeoJSON source that fetches data based on viewport
 * @param {Object} options
 * @param {Object} options.dataset - Dataset configuration
 * @param {Object} options.map - Map instance
 * @param {string} options.sourceId - Source ID for the map
 * @param {Function} options.onUpdate - Callback when source data should be updated
 * @returns {Object} { destroy, clear, refresh }
 */
export const createDynamicSource = ({ dataset, map, onUpdate }) => {
  const { geojson: baseUrl, idProperty, transformRequest, maxFeatures, minZoom = 0 } = dataset

  // Feature cache: id → { feature, bbox, lastSeenAt }
  const features = new Map()

  // Track the bbox we've fetched data for
  let fetchedBbox = null

  // Abort controller for the in-flight request
  let currentController = null

  /**
   * Convert features Map to FeatureCollection
   */
  const toFeatureCollection = () => ({
    type: 'FeatureCollection',
    features: Array.from(features.values()).map(entry => entry.feature)
  })

  /**
   * Get feature ID from a feature
   */
  const getFeatureId = (feature) => {
    if (idProperty) {
      return feature.properties?.[idProperty] ?? feature.id
    }
    return feature.id
  }

  /**
   * Evict features that are outside the current viewport
   * Uses "least recently visible" strategy - evicts features furthest from viewport first
   */
  const evictIfNeeded = (currentBbox) => {
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
   * Fetch data for the current viewport
   */
  const fetchData = async () => {
    const zoom = map.getZoom()
    if (zoom < minZoom) {
      return
    }

    const currentBbox = getBboxArray(map)

    // Skip if current viewport is already covered
    if (fetchedBbox && bboxContains(fetchedBbox, currentBbox)) {
      return
    }

    // Abort any in-flight request — new viewport takes priority
    if (currentController) {
      currentController.abort()
    }
    currentController = new AbortController()

    try {
      const context = { bbox: currentBbox, zoom, dataset }
      const data = await fetchGeoJSON(baseUrl, context, transformRequest, currentController.signal)

      const now = Date.now()

      // Add/update features with deduplication, refreshing lastSeenAt on each fetch
      data.features.forEach(feature => {
        const id = getFeatureId(feature)
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

      // Expand tracked bbox
      fetchedBbox = expandBbox(fetchedBbox, currentBbox)

      // Evict if over limit; if features were removed, fetchedBbox no longer
      // covers those regions — reset to current viewport to force re-fetch on return
      const sizeBeforeEviction = features.size
      evictIfNeeded(currentBbox)
      if (features.size < sizeBeforeEviction) {
        fetchedBbox = currentBbox
      }

      // Update map source
      onUpdate(dataset.id, toFeatureCollection())
    } catch (error) {
      if (error.name === 'AbortError') {
        return
      }
      console.error(`Failed to fetch dynamic GeoJSON for ${dataset.id}:`, error)
    }
  }

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
      if (currentController) {
        currentController.abort()
      }
    },

    /**
     * Clear all cached features and reset fetch tracking
     */
    clear () {
      features.clear()
      fetchedBbox = null
      onUpdate(dataset.id, { type: 'FeatureCollection', features: [] })
    },

    /**
     * Force refresh - clear cache and fetch current viewport
     */
    refresh () {
      features.clear()
      fetchedBbox = null
      fetchData()
    },

    /**
     * Get current feature count
     */
    getFeatureCount () {
      return features.size
    },

    /**
     * Re-push cached features to the source (e.g., after style change)
     */
    reapply () {
      if (features.size > 0) {
        onUpdate(dataset.id, toFeatureCollection())
      }
    }
  }
}
