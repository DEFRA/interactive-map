// Non-passthrough debounce: captures fn without calling it so tests can control when it fires
import { attachMapEvents } from './mapEvents.js'

const mockDebounceFns = []

jest.mock('../../../../src/utils/debounce.js', () => ({
  __esModule: true,
  debounce: (fn) => {
    const wrapper = jest.fn()
    wrapper.cancel = jest.fn()
    mockDebounceFns.push({ fn, wrapper })
    return wrapper
  }
}))

// Passthrough throttle: calls fn immediately (no cancel needed, not added to debouncers)
jest.mock('../../../../src/utils/throttle.js', () => ({
  __esModule: true,
  throttle: (fn) => jest.fn(fn)
}))

const events = {
  MAP_LOADED: 'map:loaded',
  MAP_FIRST_IDLE: 'map:firstidle',
  MAP_MOVE_START: 'map:movestart',
  MAP_MOVE: 'map:move',
  MAP_MOVE_END: 'map:moveend',
  MAP_CLICK: 'map:click',
  MAP_RENDER: 'map:render',
  MAP_DATA_CHANGE: 'map:datachange'
}

function makeTarget () {
  const handlers = {}
  return {
    on: jest.fn((type, handler) => { (handlers[type] = handlers[type] || []).push(handler) }),
    once: jest.fn((type, handler) => { (handlers[type] = handlers[type] || []).push(handler) }),
    un: jest.fn(),
    trigger: (type, event = {}) => (handlers[type] || []).forEach(h => h(event))
  }
}

function setup () {
  mockDebounceFns.length = 0

  const view = makeTarget()
  view.getMinZoom = jest.fn(() => 0)
  view.getMaxZoom = jest.fn(() => 13)

  const map = makeTarget()
  map.getView = jest.fn(() => view)

  const source = makeTarget()
  source.changed = jest.fn()
  const eventBus = { emit: jest.fn() }

  const getZoom = jest.fn(() => 7)
  const getCenter = jest.fn(() => [400000, 300000])
  const getBounds = jest.fn(() => [0, 0, 800, 600])
  const getResolution = jest.fn(() => 56)

  const handles = attachMapEvents({ map, source, events, eventBus, getZoom, getCenter, getBounds, getResolution })

  return { map, view, source, eventBus, handles }
}

describe('attachMapEvents — load events', () => {
  it('emits MAP_LOADED on first tileloadend', () => {
    const { source, eventBus } = setup()
    source.trigger('tileloadend')
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_LOADED)
  })

  it('does not re-emit MAP_LOADED on subsequent tileloadend', () => {
    const { source, eventBus } = setup()
    source.trigger('tileloadend')
    eventBus.emit.mockClear()
    source.trigger('tileloadend')
    expect(eventBus.emit).not.toHaveBeenCalledWith(events.MAP_LOADED)
  })

  it('emits MAP_FIRST_IDLE on rendercomplete', () => {
    const { map, eventBus } = setup()
    map.trigger('rendercomplete')
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_FIRST_IDLE, expect.any(Object))
  })
})

describe('attachMapEvents — move events', () => {
  it('emits MAP_MOVE_START on first view change', () => {
    const { view, eventBus } = setup()
    view.trigger('change')
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_MOVE_START)
  })

  it('does not re-emit MAP_MOVE_START while already moving', () => {
    const { view, eventBus } = setup()
    view.trigger('change')
    eventBus.emit.mockClear()
    view.trigger('change')
    expect(eventBus.emit).not.toHaveBeenCalledWith(events.MAP_MOVE_START)
  })

  it('emits MAP_MOVE_END (with state) when debounced callback fires', () => {
    const { view, eventBus } = setup()
    view.trigger('change')
    mockDebounceFns[0].fn() // emitMoveEnd's inner callback
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_MOVE_END, expect.any(Object))
  })

  it('resets moving flag after MAP_MOVE_END so MAP_MOVE_START can fire again', () => {
    const { view, eventBus } = setup()
    view.trigger('change')
    mockDebounceFns[0].fn() // resets moving = false
    eventBus.emit.mockClear()
    view.trigger('change')
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_MOVE_START)
  })

  it('emits MAP_MOVE on postrender when moving', () => {
    const { view, map, eventBus } = setup()
    view.trigger('change') // sets moving = true (debounce wrapper does not reset it)
    map.trigger('postrender')
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_MOVE, expect.any(Object))
  })

  it('does not emit MAP_MOVE on postrender when not moving', () => {
    const { map, eventBus } = setup()
    map.trigger('postrender')
    expect(eventBus.emit).not.toHaveBeenCalledWith(events.MAP_MOVE, expect.anything())
  })
})

describe('attachMapEvents — click events', () => {
  it('emits MAP_CLICK with point and coords on click with no prior pointerdown', () => {
    const { map, eventBus } = setup()
    map.trigger('click', { pixel: [100, 200], coordinate: [400000, 300000] })
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_CLICK, {
      point: { x: 100, y: 200 },
      coords: [400000, 300000]
    })
  })

  it('emits MAP_CLICK when drag distance is within tolerance', () => {
    const { map, eventBus } = setup()
    // Math.hypot(4, 3) = 5 < DRAG_TOLERANCE(6)
    map.trigger('pointerdown', { pixel: [100, 200] })
    map.trigger('click', { pixel: [104, 203], coordinate: [400000, 300000] })
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_CLICK, expect.any(Object))
  })

  it('suppresses MAP_CLICK when drag distance exceeds tolerance', () => {
    const { map, eventBus } = setup()
    // Math.hypot(7, 0) = 7 > DRAG_TOLERANCE(6)
    map.trigger('pointerdown', { pixel: [100, 200] })
    map.trigger('click', { pixel: [107, 200], coordinate: [400000, 300000] })
    expect(eventBus.emit).not.toHaveBeenCalledWith(events.MAP_CLICK, expect.anything())
  })
})

describe('attachMapEvents — render and data events', () => {
  it('calls source.changed on moveend to force vector tile re-render', () => {
    const { map, source } = setup()
    map.trigger('moveend')
    expect(source.changed).toHaveBeenCalled()
  })

  it('emits MAP_RENDER on every postrender', () => {
    const { map, eventBus } = setup()
    map.trigger('postrender')
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_RENDER)
  })

  it('emits MAP_DATA_CHANGE (with state) when debounced tileloadend callback fires', () => {
    const { source, eventBus } = setup()
    source.trigger('tileloadend')
    mockDebounceFns[1].fn() // emitDataChange's inner callback
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_DATA_CHANGE, expect.any(Object))
  })
})

describe('attachMapEvents — remove', () => {
  it('calls cancel on all debouncers', () => {
    const { handles } = setup()
    handles.remove()
    expect(mockDebounceFns[0].wrapper.cancel).toHaveBeenCalled()
    expect(mockDebounceFns[1].wrapper.cancel).toHaveBeenCalled()
  })

  it('calls un on all registered event targets', () => {
    const { handles, map, view, source } = setup()
    handles.remove()
    expect(view.un).toHaveBeenCalled()
    expect(map.un).toHaveBeenCalled()
    expect(source.un).toHaveBeenCalled()
  })

  it('prevents state-bearing events from emitting after destroy', () => {
    const { eventBus, handles } = setup()
    handles.remove()
    mockDebounceFns[0].fn() // emitMoveEnd fires after destroy → getMapState returns null
    expect(eventBus.emit).not.toHaveBeenCalledWith(events.MAP_MOVE_END, expect.anything())
  })
})
