import { attachAppEvents } from './appEvents.js'

describe('attachAppEvents', () => {
  let map, mapProvider, eventBus, events

  beforeEach(() => {
    map = {
      setStyle: jest.fn(),
      setPixelRatio: jest.fn(),
      once: jest.fn()
    }
    mapProvider = { mapSize: null }
    eventBus = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    }
    events = {
      MAP_SET_STYLE: 'map:set-style',
      MAP_SET_PIXEL_RATIO: 'map:set-pixel-ratio',
      MAP_STYLE_CHANGE: 'map:stylechange',
      MAP_SIZE_CHANGE: 'map:size-change'
    }
  })

  it('attaches handlers and triggers correct map methods', () => {
    const controller = attachAppEvents({ mapProvider, map, events, eventBus })

    // Verify eventBus.on was called with correct handlers
    expect(eventBus.on).toHaveBeenCalledWith(events.MAP_SET_STYLE, expect.any(Function))
    expect(eventBus.on).toHaveBeenCalledWith(events.MAP_SET_PIXEL_RATIO, expect.any(Function))
    expect(eventBus.on).toHaveBeenCalledWith(events.MAP_SIZE_CHANGE, expect.any(Function))

    // Extract the attached handlers
    const styleHandler = eventBus.on.mock.calls.find(c => c[0] === events.MAP_SET_STYLE)[1]
    const pixelHandler = eventBus.on.mock.calls.find(c => c[0] === events.MAP_SET_PIXEL_RATIO)[1]

    // Call handlers to verify map methods
    styleHandler({ id: 'outdoor', url: 'style.json' })
    pixelHandler(2)

    expect(map.setStyle).toHaveBeenCalledWith('style.json', { diff: false })
    expect(map.once).toHaveBeenCalledWith('style.load', expect.any(Function))
    expect(map.setPixelRatio).toHaveBeenCalledWith(2)

    // Simulate style.load firing — should emit MAP_STYLE_CHANGE
    const styleLoadCallback = map.once.mock.calls.find(c => c[0] === 'style.load')[1]
    styleLoadCallback()
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_STYLE_CHANGE, { mapStyleId: 'outdoor' })

    // Verify remove detaches all handlers
    controller.remove()
    expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_STYLE, styleHandler)
    expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_PIXEL_RATIO, pixelHandler)
    const sizeHandler = eventBus.on.mock.calls.find(c => c[0] === events.MAP_SIZE_CHANGE)[1]
    expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SIZE_CHANGE, sizeHandler)
  })

  it('updates mapProvider.mapSize when MAP_SIZE_CHANGE fires', () => {
    attachAppEvents({ mapProvider, map, events, eventBus })

    const sizeHandler = eventBus.on.mock.calls.find(c => c[0] === events.MAP_SIZE_CHANGE)[1]
    sizeHandler({ mapSize: 'large' })

    expect(mapProvider.mapSize).toBe('large')
  })
})
