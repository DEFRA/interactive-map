import { createTileSource, createVectorTileLayer } from './utils/tileLayers.js'

export { createTileSource, createVectorTileLayer }

export function attachAppEvents ({ layer, layerType, transformRequest, events, eventBus, map }) {
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

  eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)

  return {
    remove () {
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
    }
  }
}
