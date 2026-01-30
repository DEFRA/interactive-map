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

export {
  getExtentFromFlatCoords,
  getPointFromFlatCoords
}