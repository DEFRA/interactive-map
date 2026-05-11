import { debounce } from '../../../../src/utils/debounce.js'
import { throttle } from '../../../../src/utils/throttle.js'
import { TILE_GRID_RESOLUTIONS, ZOOM_TOLERANCE } from './defaults.js'

const DEBOUNCE_IDLE_TIME = 500
const MOVE_THROTTLE_TIME = 10
const DRAG_TOLERANCE = 6

function attachLoadEvents ({ source, map, emit, eventBus, events, on }) {
  let loadedEmitted = false
  on(source, 'tileloadend', () => {
    if (!loadedEmitted) {
      loadedEmitted = true
      eventBus.emit(events.MAP_LOADED)
    }
  })
  map.once('rendercomplete', () => emit(events.MAP_FIRST_IDLE))
}

function attachMoveEvents ({ map, view, emit, eventBus, events, on, debouncers }) {
  let moving = false

  const emitMoveEnd = debounce(() => {
    moving = false
    emit(events.MAP_MOVE_END)
  }, DEBOUNCE_IDLE_TIME)
  debouncers.push(emitMoveEnd)

  const emitMove = throttle(() => emit(events.MAP_MOVE), MOVE_THROTTLE_TIME)

  on(view, 'change', () => {
    if (!moving) {
      moving = true
      eventBus.emit(events.MAP_MOVE_START)
    }
    emitMoveEnd()
  })

  // Drive MAP_MOVE from postrender so resolution reads the actual animated value each frame,
  // matching MapLibre/ESRI smooth scale bar behaviour
  on(map, 'postrender', () => {
    if (moving) {
      emitMove()
    }
  })
}

function attachClickEvents ({ map, eventBus, events, on }) {
  let pointerDownPixel = null

  on(map, 'pointerdown', (e) => {
    pointerDownPixel = e.pixel
  })

  on(map, 'click', (e) => {
    if (pointerDownPixel) {
      const dx = e.pixel[0] - pointerDownPixel[0]
      const dy = e.pixel[1] - pointerDownPixel[1]
      if (Math.hypot(dx, dy) > DRAG_TOLERANCE) {
        return
      }
    }
    eventBus.emit(events.MAP_CLICK, {
      point: { x: e.pixel[0], y: e.pixel[1] },
      coords: e.coordinate
    })
  })
}

export function attachMapEvents ({
  map,
  source,
  events,
  eventBus,
  getZoom,
  getCenter,
  getBounds,
  getResolution
}) {
  let destroyed = false
  const listeners = []
  const debouncers = []

  const getMapState = () => {
    if (destroyed) {
      return null
    }
    const zoom = getZoom()
    const maxZoom = TILE_GRID_RESOLUTIONS.length - 1
    return {
      center: getCenter(),
      bounds: getBounds(),
      resolution: getResolution(),
      zoom,
      isAtMaxZoom: zoom + ZOOM_TOLERANCE >= maxZoom,
      isAtMinZoom: zoom - ZOOM_TOLERANCE <= 0
    }
  }

  const emit = (name) => {
    const state = getMapState()
    if (state) {
      eventBus.emit(name, state)
    }
  }

  const on = (target, type, handler) => {
    target.on(type, handler)
    listeners.push([target, type, handler])
  }

  attachLoadEvents({ source, map, emit, eventBus, events, on })
  attachMoveEvents({ map, view: map.getView(), emit, eventBus, events, on, debouncers })
  attachClickEvents({ map, eventBus, events, on })

  on(map, 'postrender', () => eventBus.emit(events.MAP_RENDER))

  const emitDataChange = debounce(() => emit(events.MAP_DATA_CHANGE), DEBOUNCE_IDLE_TIME)
  debouncers.push(emitDataChange)
  on(source, 'tileloadend', emitDataChange)

  return {
    remove () {
      destroyed = true
      debouncers.forEach(d => d.cancel())
      listeners.forEach(([target, type, handler]) => target.un(type, handler))
    }
  }
}
