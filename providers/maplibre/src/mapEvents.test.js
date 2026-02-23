import { attachMapEvents } from './mapEvents.js'

jest.mock('../../../src/utils/debounce.js', () => ({
  debounce: jest.fn(fn => {
    const d = jest.fn((...args) => fn(...args))
    d.cancel = jest.fn()
    return d
  })
}))

jest.mock('../../../src/utils/throttle.js', () => ({
  throttle: jest.fn(fn => {
    const t = jest.fn((...args) => fn(...args))
    t.cancel = jest.fn()
    return t
  })
}))

describe('attachMapEvents', () => {
  let map, eventBus, events, getCenter, getZoom, getBounds, getResolution, result

  const handler = (evt) => map.on.mock.calls.find(([e]) => e === evt)[1]

  beforeEach(() => {
    map = {
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      getMaxZoom: jest.fn(() => 20),
      getMinZoom: jest.fn(() => 0)
    }
    eventBus = { emit: jest.fn() }
    events = {
      MAP_LOADED: 'loaded', MAP_FIRST_IDLE: 'firstIdle', MAP_MOVE_START: 'moveStart',
      MAP_MOVE_END: 'moveEnd', MAP_MOVE: 'move', MAP_RENDER: 'render',
      MAP_DATA_CHANGE: 'dataChange', MAP_STYLE_CHANGE: 'styleChange', MAP_CLICK: 'click'
    }
    getCenter = jest.fn(() => [0, 0])
    getZoom = jest.fn(() => 10)
    getBounds = jest.fn(() => [[0, 0], [1, 1]])
    getResolution = jest.fn(() => 100)
    result = attachMapEvents({ map, events, eventBus, getCenter, getZoom, getBounds, getResolution })
  })

  test('registers listeners for all map events', () => {
    ;['load', 'movestart', 'moveend', 'zoom', 'render', 'styledata', 'style.load', 'click'].forEach(e =>
      expect(map.on).toHaveBeenCalledWith(e, expect.any(Function))
    )
    expect(map.once).toHaveBeenCalledWith('idle', expect.any(Function))
  })

  test('stateless events emit correct event names', () => {
    handler('load')()
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_LOADED, undefined)
    handler('movestart')()
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_MOVE_START, undefined)
    handler('render')()
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_RENDER, undefined)
    handler('style.load')()
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_STYLE_CHANGE, undefined)
  })

  test('stateful events emit map state', () => {
    const state = {
      center: [0, 0], bounds: [[0, 0], [1, 1]], resolution: 100,
      zoom: 10, isAtMaxZoom: false, isAtMinZoom: false
    }
    map.once.mock.calls.find(([e]) => e === 'idle')[1]()
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_FIRST_IDLE, state)
    handler('moveend')()
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_MOVE_END, state)
    handler('zoom')()
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_MOVE, state)
    handler('styledata')()
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_DATA_CHANGE, state)
  })

  test('getMapState: isAtMaxZoom true at max zoom; isAtMinZoom true at min zoom', () => {
    getZoom.mockReturnValue(20)
    handler('moveend')()
    expect(eventBus.emit).toHaveBeenLastCalledWith(events.MAP_MOVE_END,
      expect.objectContaining({ isAtMaxZoom: true, isAtMinZoom: false })
    )
    eventBus.emit.mockClear()
    getZoom.mockReturnValue(0)
    handler('moveend')()
    expect(eventBus.emit).toHaveBeenLastCalledWith(events.MAP_MOVE_END,
      expect.objectContaining({ isAtMaxZoom: false, isAtMinZoom: true })
    )
  })

  test('click emits MAP_CLICK with point and coords', () => {
    handler('click')({ point: { x: 10, y: 20 }, lngLat: { lng: -1.5, lat: 52.3 } })
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_CLICK, {
      point: { x: 10, y: 20 },
      coords: [-1.5, 52.3]
    })
  })

  test('remove() cancels debouncers and unregisters all handlers', () => {
    const moveEndFn = handler('moveend')
    const moveFn = handler('zoom')
    const dataChangeFn = handler('styledata')

    result.remove()

    expect(moveEndFn.cancel).toHaveBeenCalled()
    expect(moveFn.cancel).toHaveBeenCalled()
    expect(dataChangeFn.cancel).toHaveBeenCalled()
    expect(map.off).toHaveBeenCalledTimes(8)
    ;['load', 'movestart', 'moveend', 'zoom', 'render', 'styledata', 'style.load', 'click'].forEach(e =>
      expect(map.off).toHaveBeenCalledWith(e, expect.any(Function))
    )
  })
})
