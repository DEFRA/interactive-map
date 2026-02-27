import { debounce } from '../../../src/utils/debounce.js'
import { throttle } from '../../../src/utils/throttle.js'

const DEBOUNCE_IDLE_TIME = 500
const MOVE_THROTTLE_TIME = 10

export function attachMapEvents ({
  map,
  events,
  eventBus,
  getCenter,
  getZoom,
  getBounds,
  getResolution
}) {
  const handlers = []
  const debouncers = []

  const getMapState = () => {
    const zoom = getZoom()
    return {
      center: getCenter(),
      bounds: getBounds(),
      resolution: getResolution(),
      zoom,
      isAtMaxZoom: map.getMaxZoom() <= zoom,
      isAtMinZoom: map.getMinZoom() >= zoom
    }
  }

  const emitEvent = (name, state) => eventBus.emit(name, state)

  // loaded
  const onLoad = () => emitEvent(events.MAP_LOADED)
  map.on('load', onLoad)
  handlers.push(['load', onLoad])

  // first idle
  const onFirstIdle = () => emitEvent(events.MAP_FIRST_IDLE, getMapState())
  map.once('idle', onFirstIdle)

  // movestart
  const onMoveStart = () => emitEvent(events.MAP_MOVE_START)
  map.on('movestart', onMoveStart)
  handlers.push(['movestart', onMoveStart])

  // moveend (debounced)
  const onMoveEnd = debounce(() => {
    emitEvent(events.MAP_MOVE_END, getMapState())
  }, DEBOUNCE_IDLE_TIME)

  map.on('moveend', onMoveEnd)
  handlers.push(['moveend', onMoveEnd])
  debouncers.push(onMoveEnd)

  // move (throttled)
  const onMove = throttle(() => {
    emitEvent(events.MAP_MOVE, getMapState())
  }, MOVE_THROTTLE_TIME)

  map.on('zoom', onMove)
  handlers.push(['zoom', onMove])
  debouncers.push(onMove)

  // render
  const onRender = () => emitEvent(events.MAP_RENDER)
  map.on('render', onRender)
  handlers.push(['render', onRender])

  // data change (debounced)
  const onDataChange = debounce(() => {
    emitEvent(events.MAP_DATA_CHANGE, getMapState())
  }, DEBOUNCE_IDLE_TIME)

  map.on('styledata', onDataChange)
  handlers.push(['styledata', onDataChange])
  debouncers.push(onDataChange)

  // style change
  const onStyleChange = () => emitEvent(events.MAP_STYLE_CHANGE)
  map.on('style.load', onStyleChange)
  handlers.push(['style.load', onStyleChange])

  // click
  const onClick = (e) => emitEvent(events.MAP_CLICK, {
    point: e.point,
    coords: [e.lngLat.lng, e.lngLat.lat]
  })

  map.on('click', onClick)
  handlers.push(['click', onClick])

  // Cleanup
  return {
    remove () {
      debouncers.forEach(d => d.cancel())
      handlers.forEach(([event, fn]) => map.off(event, fn))
    }
  }
}
