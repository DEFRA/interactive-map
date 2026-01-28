/**
 * Compute inset positions for a child div that is centered, respects aspect ratio, and max width per breakpoint.
 *
 * @param {number} parentWidth - Width of the container (px)
 * @param {number} parentHeight - Height of the container (px)
 * @param {object} config - { aspectRatio: number, mobileWidth: string, tabletWidth: string, desktopWidth: string }
 * @param {string} breakpoint - 'mobile' | 'tablet' | 'desktop'
 * @returns {{top:number, left:number, width:number, height:number}} - positions in px
 */
function computeInset (parentWidth, parentHeight, config, breakpoint) {
  // pick max width for current breakpoint
  const maxWidth = Number.parseInt(config[`${breakpoint}Width`] || parentWidth, 10)

  // start with max width
  let width = Math.min(maxWidth, parentWidth)
  let height = width / config.aspectRatio

  // check if height exceeds container
  if (height > parentHeight) {
    height = parentHeight
    width = height * config.aspectRatio
  }

  const left = (parentWidth - width) / 2
  const top = (parentHeight - height) / 2

  return { top, left, width, height }
}

/**
 * Convert a frame element's position to a GeoJSON Polygon feature
 * @param {object} params
 * @param {HTMLElement} params.frameEl - The frame DOM element
 * @param {HTMLElement} params.viewportEl - The viewport DOM element
 * @param {object} params.mapProvider - Map provider with screenToMap method
 * @param {string} [params.featureId] - Optional feature ID
 * @param {number} params.scale - Scale factor for coordinate conversion
 * @returns {object} GeoJSON Feature with Polygon geometry
 */
function convertFrameToFeature ({ frameEl, viewportEl, mapProvider, featureId, scale }) {
  const fBox = frameEl.getBoundingClientRect()
  const vBox = viewportEl.getBoundingClientRect()

  // Get frame corners relative to viewport, using scale
  const topLeft = { x: (fBox.left - vBox.left) / scale, y: (fBox.top - vBox.top) / scale }
  const topRight = { x: (fBox.right - vBox.left) / scale, y: (fBox.top - vBox.top) / scale }
  const bottomRight = { x: (fBox.right - vBox.left) / scale, y: (fBox.bottom - vBox.top) / scale }
  const bottomLeft = { x: (fBox.left - vBox.left) / scale, y: (fBox.bottom - vBox.top) / scale }

  // Convert pixel coordinates to map coordinates (returns [x, y] array - could be [lng, lat] or [easting, northing])
  const coords = [
    mapProvider.screenToMap(topLeft),
    mapProvider.screenToMap(topRight),
    mapProvider.screenToMap(bottomRight),
    mapProvider.screenToMap(bottomLeft),
    mapProvider.screenToMap(topLeft) // Close the ring
  ]

  // Create GeoJSON Polygon
  const feature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    },
    properties: {}
  }

  // Include id if provided
  if (featureId) {
    feature.id = featureId
  }

  return feature
}

/**
 * Extract bounds from a GeoJSON Polygon feature
 * @param {object} feature - GeoJSON Feature with Polygon geometry
 * @returns {array} bounds - [minX, minY, maxX, maxY] (could be [minLng, minLat, maxLng, maxLat] or [minE, minN, maxE, maxN])
 */
function convertFeatureToBounds (feature) {
  if (!feature?.geometry?.coordinates?.[0]) {
    return null
  }

  const coords = feature.geometry.coordinates[0]

  // Find min/max x and y values
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  coords.forEach(([x, y]) => {
    if (x < minX) {
      minX = x
    }
    if (x > maxX) {
      maxX = x
    }
    if (y < minY) {
      minY = y
    }
    if (y > maxY) {
      maxY = y
    }
  })

  return [minX, minY, maxX, maxY]
}

/**
 * Calculate the aspect ratio of a GeoJSON Polygon feature
 * @param {object} feature - GeoJSON Feature with Polygon geometry
 * @param {object} mapProvider - Map provider with mapToScreen method
 * @returns {number|null} Aspect ratio (width / height) or null if invalid
 */
function getFeatureAspectRatio (feature, mapProvider) {
  const bounds = convertFeatureToBounds(feature)
  if (!bounds) {
    return null
  }

  const [minX, minY, maxX, maxY] = bounds
  const topLeft = mapProvider.mapToScreen([minX, maxY])
  const bottomRight = mapProvider.mapToScreen([maxX, minY])

  const width = Math.abs(bottomRight.x - topLeft.x)
  const height = Math.abs(bottomRight.y - topLeft.y)

  if (height === 0) {
    return null
  }
  
  // Round to 6 decimal places to account for floating point precision
  return Math.round((width / height) * 1000000) / 1000000
}

export {
  computeInset,
  convertFrameToFeature,
  convertFeatureToBounds,
  getFeatureAspectRatio
}
