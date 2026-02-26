import { attachAppEvents } from './appEvents.js'

describe('attachAppEvents', () => {
  let map, eventBus, events

  beforeEach(() => {
    map = {
      setStyle: jest.fn(),
      setPixelRatio: jest.fn(),
      once: jest.fn()
    }
    eventBus = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    }
    events = {
      MAP_SET_STYLE: 'map:set-style',
      MAP_SET_PIXEL_RATIO: 'map:set-pixel-ratio',
      MAP_STYLE_CHANGE: 'map:stylechange'
    }
  })

  it('attaches handlers and triggers correct map methods', () => {
    const controller = attachAppEvents({ map, events, eventBus })

    // Verify eventBus.on was called with correct handlers
    expect(eventBus.on).toHaveBeenCalledWith(events.MAP_SET_STYLE, expect.any(Function))
    expect(eventBus.on).toHaveBeenCalledWith(events.MAP_SET_PIXEL_RATIO, expect.any(Function))

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

    // Verify remove detaches handlers
    controller.remove()
    expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_STYLE, styleHandler)
    expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_PIXEL_RATIO, pixelHandler)
  })
})