export function attachAppEvents ({
  mapProvider,
  map,
  events,
  eventBus
}) {
  const handleSetMapStyle = (mapStyle) => {
    map.once('style.load', () => {
      eventBus.emit(events.MAP_STYLE_CHANGE, {
        mapStyleId: mapStyle.id
      })
    })
    map.setStyle(mapStyle.url, { diff: false })
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
