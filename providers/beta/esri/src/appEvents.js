export function attachAppEvents ({ baseTileLayer, events, eventBus }) {
  const handleSetMapStyle = mapStyle => {
    baseTileLayer.loadStyle(mapStyle.url).then(() => {
      eventBus.emit(events.MAP_STYLE_CHANGE, mapStyle)
    })
  }

  eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)

  return {
    remove () {
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
    }
  }
}
