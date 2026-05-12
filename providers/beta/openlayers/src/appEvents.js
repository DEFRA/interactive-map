import { createTileSource, createVectorTileLayer } from './utils/tileLayers.js'

export { createTileSource, createVectorTileLayer }

export function attachAppEvents ({ mapProvider, layer, layerType, transformRequest, events, eventBus, map }) {
  const handleSetMapStyle = async (mapStyle) => {
    if (layerType === 'vector') {
      const { layer: newLayer } = await createVectorTileLayer(mapStyle.url, transformRequest)
      map.getLayers().setAt(0, newLayer)
    } else {
      const source = createTileSource(mapStyle.url, transformRequest)
      layer.setSource(source)
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
