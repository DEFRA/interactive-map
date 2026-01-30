import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js'

/**
 * Query VectorTileLayers at a screen point and return an array of "feature-like" objects.
 * @param {MapView|SceneView} view
 * @param {{x: number, y: number}} screenPoint - pixel coordinates relative to the view container
 * @returns {Promise<Array>} Array of objects with info about each vector tile layer hit
 */
export async function queryVectorTileFeatures(view, screenPoint) {
  if (!view || !screenPoint) {
    return []
  }

  // Get all VectorTileLayers in the map
  const vectorTileLayers = view.map.layers.filter(layer => layer instanceof VectorTileLayer)

  if (!vectorTileLayers.length) {
    return []
  }

  // Perform hit test including only vector tile layers
  const hitResults = await view.hitTest(screenPoint, {
    include: vectorTileLayers.toArray()
  })

  // Map results into a consistent array
  return hitResults.results.map(result => ({
    layerId: result.layer.id,
    layerTitle: result.layer.title || result.layer.id,
    type: result.layer.type,          // 'vectortile'
    geometry: result.graphic.geometry, // usually a point representing the symbol
    symbol: result.graphic.symbol     // symbol info (color, style, etc.)
    // Note: feature attributes are not exposed by the Esri SDK
  }))
}