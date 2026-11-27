import { createTileSource, createVectorTileLayer, createOGCVectorTileLayer, createMapStyleLayer } from './utils/tileLayers.js'

export { createTileSource, createVectorTileLayer, createOGCVectorTileLayer, createMapStyleLayer }

export function attachAppEvents ({ mapProvider, transformRequest, events, eventBus, map, onBaseSourceChange }) {
  const handleSetMapStyle = async (mapStyle) => {
    const { layer, source } = await createMapStyleLayer(mapStyle, transformRequest)
    map.getLayers().setAt(0, layer)
    onBaseSourceChange(source)
    eventBus.emit(events.MAP_STYLE_CHANGE, { mapStyleId: mapStyle.id })
    // MAP_DATA_CHANGE is driven by the original source's tileloadend and won't fire
    // for the new source, so re-apply highlights directly on the new layer.
    mapProvider.reapplyHighlights()
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
