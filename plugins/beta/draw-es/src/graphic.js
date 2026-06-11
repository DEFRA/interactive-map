import Graphic from '@arcgis/core/Graphic.js'
import * as simplifyOperator from '@arcgis/core/geometry/operators/simplifyOperator.js'
import { logger } from '../../../../src/services/logger.js'

function createSymbol (mapColorScheme) {
  return {
    type: 'simple-fill',
    color: [0, 120, 255, 0.2],
    outline: {
      color: mapColorScheme === 'dark' ? '#ffffff' : '#d4351c',
      width: 2
    }
  }
}

// TODO - add support for multipolygons and polygons with holes
const simplifyGraphic = (graphic, { simplify = true, allowHoles = false }) => {
  if (simplify && !simplifyOperator.isSimple(graphic.geometry)) {
    logger.warn('Feature geometry is not simple, attempting to simplify')
    graphic.geometry = simplifyOperator.execute(graphic.geometry)
    if (!simplifyOperator.isSimple(graphic.geometry)) {
      logger.error('Failed to simplify geometry, cannot add feature')
      return null
    }
  }
  if (allowHoles === false && graphic?.geometry.rings.length > 1) {
    logger.error('Feature contains multiple polygons, which are not supported.')
    return null
  }
  return graphic
}

function createGraphic (id, coordinates, mapColorScheme, simplifyOptions = {}) {
  const { simplify = true, allowHoles = false } = simplifyOptions
  const graphic = new Graphic({
    geometry: {
      type: 'polygon',
      rings: coordinates,
      spatialReference: 27700
    },
    attributes: {
      id
    },
    symbol: createSymbol(mapColorScheme)
  })
  if (simplify || allowHoles === false) {
    return simplifyGraphic(graphic, simplifyOptions)
  }
  return graphic
}

function graphicToGeoJSON (graphic) {
  if (!graphic?.geometry) {
    throw new Error('Invalid graphic')
  }

  const { geometry, attributes = {} } = graphic

  switch (geometry.type) {
    case 'point':
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [geometry.x, geometry.y]
        },
        properties: { ...attributes }
      }

    case 'polyline':
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: geometry.paths[0]
        },
        properties: { ...attributes }
      }

    case 'polygon':
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: geometry.rings
        },
        properties: { ...attributes }
      }

    default:
      throw new Error(`Unsupported geometry type: ${geometry.type}`)
  }
}

export {
  createSymbol,
  createGraphic,
  graphicToGeoJSON
}
