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
export const createDynamicSource = ({ dataset, map, sourceId, onUpdate }) => {
  const { geojson: baseUrl, idProperty, transformRequest, maxFeatures, minZoom = 0 } = dataset

  // Feature cache: id → { feature, bbox, addedAt }
  const features = new Map()

  // Track the bbox we've fetched data for
  let fetchedBbox = null

  // Loading state
  let isLoading = false

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
        outOfView.push({ id, addedAt: data.addedAt })
      }
    }

    // Sort out-of-view by insertion time (oldest first)
    outOfView.sort((a, b) => a.addedAt - b.addedAt)

    // Evict oldest out-of-view features until under target
    const toEvict = features.size - targetSize
    for (let i = 0; i < toEvict && i < outOfView.length; i++) {
      features.delete(outOfView[i].id)
    }

    // If still over target (viewport has too many), evict oldest in-view
    if (features.size > targetSize) {
      const remaining = features.size - targetSize
      const inViewSorted = inView
        .map(id => ({ id, addedAt: features.get(id).addedAt }))
        .sort((a, b) => a.addedAt - b.addedAt)

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

    if (isLoading) {
      return
    }

    isLoading = true

    try {
      const context = { bbox: currentBbox, zoom, dataset }
      const data = await fetchGeoJSON(baseUrl, context, transformRequest)

      const now = Date.now()

      // Add/update features with deduplication
      data.features.forEach(feature => {
        const id = getFeatureId(feature)
        if (id == null) {
          console.warn('Feature missing ID, skipping:', feature)
          return
        }

        features.set(id, {
          feature,
          bbox: getGeometryBbox(feature.geometry),
          addedAt: features.has(id) ? features.get(id).addedAt : now
        })
      })

      // Expand tracked bbox
      fetchedBbox = expandBbox(fetchedBbox, currentBbox)

      // Evict if over limit
      evictIfNeeded(currentBbox)

      // Update map source
      onUpdate(sourceId, toFeatureCollection())
    } catch (error) {
      console.error(`Failed to fetch dynamic GeoJSON for ${dataset.id}:`, error)
    } finally {
      isLoading = false
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
     * Clean up event listeners
     */
    destroy() {
      map.off('moveend', handleMoveEnd)
      debouncedFetch.cancel()
    },

    /**
     * Clear all cached features and reset fetch tracking
     */
    clear() {
      features.clear()
      fetchedBbox = null
      onUpdate(sourceId, { type: 'FeatureCollection', features: [] })
    },

    /**
     * Force refresh - clear cache and fetch current viewport
     */
    refresh() {
      features.clear()
      fetchedBbox = null
      fetchData()
    },

    /**
     * Get current feature count
     */
    getFeatureCount() {
      return features.size
    },

    /**
     * Re-push cached features to the source (e.g., after style change)
     */
    reapply() {
      if (features.size > 0) {
        onUpdate(sourceId, toFeatureCollection())
      }
    }
  }
}
