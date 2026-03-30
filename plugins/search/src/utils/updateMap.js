// src/plugins/search/utils/updateMap.js

/**
 * Updates the map viewport and optionally adds a marker.
 *
 * @param {Object} mapProvider - The map API/provider
 * @param {Object} bounds - Map bounds to fit
 * @param {Object} point - Marker point
 * @param {Object} markers - Marker manager
 * @param {boolean} showMarker - Whether to display a marker
 * @param {Object} markerOptions - Symbol and color options passed to markers.add()
 */
export function updateMap ({ mapProvider, bounds, point, markers, showMarker, markerOptions }) {
  mapProvider.fitToBounds(bounds)
  if (showMarker) {
    markers.add('search', point, markerOptions)
  }
}
