import Extent from '@arcgis/core/geometry/Extent.js'
import Point from '@arcgis/core/geometry/Point.js'

const getExtentFromFlatCoords = (coords) => {
  return coords
    ? new Extent({
      xmin: coords[0],
      ymin: coords[1],
      xmax: coords[2],
      ymax: coords[3], // NOSONAR, this is an extent reference
      spatialReference: { wkid: 27700 }
    })
    : undefined
}

const getPointFromFlatCoords = (coords) => {
  return coords
    ? new Point({
      x: coords[0],
      y: coords[1],
      spatialReference: { wkid: 27700 }
    })
    : undefined
}

const collectCoords = (obj, acc) => {
  if (!obj) { return }
  if (obj.type === 'FeatureCollection') {
    obj.features.forEach(feature => collectCoords(feature, acc))
  } else if (obj.type === 'Feature') {
    collectCoords(obj.geometry, acc)
  } else if (obj.type === 'GeometryCollection') {
    obj.geometries.forEach(geometry => collectCoords(geometry, acc))
  } else {
    const flatten = (coords) => {
      if (!Array.isArray(coords)) { return }
      if (typeof coords[0] === 'number') {
        acc.push(coords)
      } else {
        coords.forEach(flatten)
      }
    }
    flatten(obj.coordinates)
  }
}

/**
 * Get an ESRI Extent from any GeoJSON object (Feature, FeatureCollection, or geometry).
 *
 * @param {object} geojson - GeoJSON Feature, FeatureCollection, or geometry
 * @returns {import('@arcgis/core/geometry/Extent.js').default}
 */
const getBboxFromGeoJSON = (geojson) => {
  const points = []
  collectCoords(geojson, points)
  const xs = points.map(p => p[0])
  const ys = points.map(p => p[1])
  return getExtentFromFlatCoords([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)])
}

/**
 * Grow an extent so that fitting it to the view keeps `padding` pixels clear around the
 * original extent, inside the view's own padding. MapView.goTo has no padding option.
 *
 * @param {import('@arcgis/core/geometry/Extent.js').default} extent
 * @param {{ top: number, right: number, bottom: number, left: number }} padding - Pixels.
 * @param {{ width: number, height: number, padding?: object }} view - The MapView.
 * @returns {import('@arcgis/core/geometry/Extent.js').default}
 */
const padExtent = (extent, padding, { width, height, padding: viewPadding }) => {
  const availableWidth = width - (viewPadding?.left ?? 0) - (viewPadding?.right ?? 0) - padding.left - padding.right
  const availableHeight = height - (viewPadding?.top ?? 0) - (viewPadding?.bottom ?? 0) - padding.top - padding.bottom
  if (availableWidth <= 0 || availableHeight <= 0) {
    return extent
  }
  // The map units per pixel the fit will use: whichever side of the extent is tighter
  const resolution = Math.max((extent.xmax - extent.xmin) / availableWidth, (extent.ymax - extent.ymin) / availableHeight)
  return new Extent({
    xmin: extent.xmin - padding.left * resolution,
    ymin: extent.ymin - padding.bottom * resolution,
    xmax: extent.xmax + padding.right * resolution,
    ymax: extent.ymax + padding.top * resolution,
    spatialReference: extent.spatialReference
  })
}

export {
  getExtentFromFlatCoords,
  getPointFromFlatCoords,
  getBboxFromGeoJSON,
  padExtent
}
