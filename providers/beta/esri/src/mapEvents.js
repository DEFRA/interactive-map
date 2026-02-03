import { watch, when, once } from '@arcgis/core/core/reactiveUtils.js'
import { debounce } from '../../../../src/utils/debounce.js'
import { throttle } from '../../../../src/utils/throttle.js'

const DEBOUNCE_IDLE_TIME = 500
const MOVE_THROTTLE_TIME = 10
const ZOOM_TOLERANCE = 0.01

export function attachMapEvents ({
  map,
  view,
  baseTileLayer,
  events,
  eventBus,
  getZoom,
  getCenter,
  getBounds,
  getResolution
}) {
  let destroyed = false
  const handlers = []
  const debouncers = []

  const getMapState = () => {
    if (destroyed || !view || view.destroyed || !view.extent) {
      return null
    }

    const { maxZoom, minZoom } = view.constraints

    return {
      center: getCenter(),
      bounds: getBounds(),
      resolution: getResolution(),
      zoom: getZoom(),
      isAtMaxZoom: view.zoom + ZOOM_TOLERANCE >= maxZoom,
      isAtMinZoom: view.zoom - ZOOM_TOLERANCE <= minZoom
    }
  }

  const emit = (name) => {
    const state = getMapState()
    if (state) {
      eventBus.emit(name, state)
    }
  }

  // loaded
  when(
    () => baseTileLayer.loaded && view.resolution > 0,
    () => emit(events.MAP_LOADED)
  )

  // ready
  once(() => view.ready).then(() => {
    if (!destroyed) {
      eventBus.emit(events.MAP_READY, { map, view })
    }
  })

  // first idle
  once(() => view.stationary).then(() => emit(events.MAP_FIRST_IDLE))

  // movestart + moveend
  const emitMoveEnd = debounce(() => emit(events.MAP_MOVE_END), DEBOUNCE_IDLE_TIME)
  debouncers.push(emitMoveEnd)

  handlers.push(watch(
    () => [view.interacting, view.animation],
    ([interacting, animation]) => {
      if (interacting || animation) {
        eventBus.emit(events.MAP_MOVE_START)
      }
      if (!interacting && !animation) {
        emitMoveEnd()
      }
    }
  ))

  // move
  const emitMove = throttle(() => emit(events.MAP_MOVE), MOVE_THROTTLE_TIME)
  debouncers.push(emitMove)

  handlers.push(watch(() => view.zoom, emitMove))

  // render
  handlers.push(watch(
    () => view.extent,
    () => eventBus.emit(events.MAP_RENDER),
    { initial: false }
  ))

  // datachange
  const emitDataChange = debounce(() => emit(events.MAP_DATA_CHANGE), DEBOUNCE_IDLE_TIME)
  debouncers.push(emitDataChange)

  handlers.push(watch(
    () => view.updating,
    updating => !updating && emitDataChange()
  ))

  // click
  handlers.push(view.on('click', e => {
    const mapPoint = e.mapPoint
    const screenPoint = { x: e.x, y: e.y }
    eventBus.emit(events.MAP_CLICK, { point: screenPoint, coords: [mapPoint.x, mapPoint.y] })
  }))

  // Cleanup
  return {
    remove () {
      destroyed = true
      debouncers.forEach(d => d.cancel())
      handlers.forEach(h => h.remove())
    }
  }
}
