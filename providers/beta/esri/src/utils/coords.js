import Extent from '@arcgis/core/geometry/Extent.js'
import Point from '@arcgis/core/geometry/Point.js'

const getExtentFromFlatCoords = (coords) => {
  return coords
    ? new Extent({
      xmin: coords[0],
      ymin: coords[1],
      xmax: coords[2],
      ymax: coords[3],
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
  if (!obj) return
  if (obj.type === 'FeatureCollection') {
    obj.features.forEach(f => collectCoords(f, acc))
  } else if (obj.type === 'Feature') {
    collectCoords(obj.geometry, acc)
  } else if (obj.type === 'GeometryCollection') {
    obj.geometries.forEach(g => collectCoords(g, acc))
  } else {
    const flatten = (coords) => {
      if (typeof coords[0] === 'number') acc.push(coords)
      else coords.forEach(flatten)
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

export {
  getExtentFromFlatCoords,
  getPointFromFlatCoords,
  getBboxFromGeoJSON
}