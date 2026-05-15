import { createTileSource, createVectorTileLayer, createOGCVectorTileLayer } from './utils/tileLayers.js'

export { createTileSource, createVectorTileLayer, createOGCVectorTileLayer }

export function attachAppEvents ({ mapProvider, layer, layerType, transformRequest, events, eventBus, map }) {
  const handleSetMapStyle = async (mapStyle) => {
    if (layerType === 'raster') {
      const source = createTileSource(mapStyle.url, transformRequest)
      layer.setSource(source)
    } else if (mapStyle.type === 'ogc-vt') {
      const { layer: newLayer } = await createOGCVectorTileLayer(mapStyle.url, transformRequest, mapStyle)
      map.getLayers().setAt(0, newLayer)
    } else {
      const { layer: newLayer } = await createVectorTileLayer(mapStyle.url, transformRequest, mapStyle)
      map.getLayers().setAt(0, newLayer)
    }
    eventBus.emit(events.MAP_STYLE_CHANGE, { mapStyleId: mapStyle.id })
  }

  const handleSetPixelRatio = (pixelRatio) => {
    map.setPixelRatio(pixelRatio)
  }

  const handleSizeChange = ({ mapSize }) => {
    mapProvider.mapSize = mapSize
  }

  eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)
  eventBus.on(events.MAP_SET_PIXEL_RATIO, handleSetPixelRatio)
  eventBus.on(events.MAP_SIZE_CHANGE, handleSizeChange)

  return {
    remove () {
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
      eventBus.off(events.MAP_SET_PIXEL_RATIO, handleSetPixelRatio)
      eventBus.off(events.MAP_SIZE_CHANGE, handleSizeChange)
    }
  }
}
