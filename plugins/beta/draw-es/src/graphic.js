import Graphic from '@arcgis/core/Graphic.js'

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

function createGraphic (id, coordinates, mapColorScheme) {
  return new Graphic({
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
}

function graphicToGeoJSON(graphic) {
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
