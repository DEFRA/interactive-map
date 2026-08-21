import { bindEditModeListeners, unbindEditModeListeners, clearActiveSnapIndicator, buildEditModeHandlers } from './editModeEvents.js'
import { CUSTOM_DRAW_EVENTS } from '../drawEvents.js'

const makeHandlers = () => ({
  keydown: jest.fn(),
  keyup: jest.fn(),
  click: jest.fn(),
  pointerdown: jest.fn(),
  pointermove: jest.fn(),
  pointerup: jest.fn(),
  touchstart: jest.fn(),
  touchmove: jest.fn(),
  touchend: jest.fn(),
  scalechange: jest.fn(),
  move: jest.fn(),
  interfacetypechange: jest.fn(),
  nudge: jest.fn()
})

const makeMap = () => ({ on: jest.fn(), off: jest.fn(), dragPan: { enable: jest.fn() } })

describe('bindEditModeListeners', () => {
  test('wires the shared window/container listeners and map events', () => {
    const state = { container: document.createElement('div') }
    jest.spyOn(window, 'addEventListener')
    jest.spyOn(state.container, 'addEventListener')
    const map = makeMap()
    const handlers = makeHandlers()

    bindEditModeListeners(state, map, handlers)

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', handlers.keydown, { capture: true })
    expect(window.addEventListener).toHaveBeenCalledWith('keyup', handlers.keyup, { capture: true })
    expect(window.addEventListener).toHaveBeenCalledWith('click', handlers.click)
    expect(state.container.addEventListener).toHaveBeenCalledWith('pointerdown', handlers.pointerdown)
    expect(state.container.addEventListener).toHaveBeenCalledWith('pointermove', handlers.pointermove)
    expect(state.container.addEventListener).toHaveBeenCalledWith('pointerup', handlers.pointerup)
    expect(state.container.addEventListener).toHaveBeenCalledWith('touchstart', handlers.touchstart, { passive: false })
    expect(state.container.addEventListener).toHaveBeenCalledWith('touchmove', handlers.touchmove, { passive: false })
    expect(state.container.addEventListener).toHaveBeenCalledWith('touchend', handlers.touchend, { passive: false })
    expect(map.on).toHaveBeenCalledWith('draw.scalechange', handlers.scalechange)
    expect(map.on).toHaveBeenCalledWith('move', handlers.move)
    expect(map.on).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, handlers.interfacetypechange)
    expect(map.on).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, handlers.nudge)

    window.addEventListener.mockRestore()
  })
})

describe('unbindEditModeListeners', () => {
  test('tears down the shared window/container listeners and map events, and re-enables dragPan', () => {
    const state = { container: document.createElement('div') }
    jest.spyOn(window, 'removeEventListener')
    jest.spyOn(state.container, 'removeEventListener')
    const map = makeMap()
    const handlers = makeHandlers()

    unbindEditModeListeners(state, map, handlers)

    expect(state.container.removeEventListener).toHaveBeenCalledWith('pointerdown', handlers.pointerdown)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('pointermove', handlers.pointermove)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('pointerup', handlers.pointerup)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('touchstart', handlers.touchstart)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('touchmove', handlers.touchmove)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('touchend', handlers.touchend)
    expect(map.off).toHaveBeenCalledWith('draw.scalechange', handlers.scalechange)
    expect(map.off).toHaveBeenCalledWith('move', handlers.move)
    expect(map.off).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, handlers.interfacetypechange)
    expect(map.off).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, handlers.nudge)
    expect(map.dragPan.enable).toHaveBeenCalled()
    expect(window.removeEventListener).toHaveBeenCalledWith('click', handlers.click)
    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', handlers.keydown, { capture: true })
    expect(window.removeEventListener).toHaveBeenCalledWith('keyup', handlers.keyup, { capture: true })

    window.removeEventListener.mockRestore()
  })
})

describe('clearActiveSnapIndicator', () => {
  test('clears the indicator when a snap instance is present', () => {
    const snap = { snapStatus: true, snapCoords: [1, 2] }
    const map = { _snapInstance: snap, getLayer: jest.fn(() => null), setLayoutProperty: jest.fn() }

    clearActiveSnapIndicator(map)

    expect(snap.snapStatus).toBe(false)
    expect(snap.snapCoords).toBeNull()
  })

  test('is a no-op without a snap instance', () => {
    expect(() => clearActiveSnapIndicator({})).not.toThrow()
  })
})

describe('buildEditModeHandlers', () => {
  test('builds the shared base handlers bound to the given mode and state', () => {
    const mode = {
      onKeydown: jest.fn(),
      onKeyup: jest.fn(),
      onPointerevent: jest.fn(),
      onButtonClick: jest.fn(),
      onTouchstart: jest.fn(),
      onTouchmove: jest.fn(),
      onTouchend: jest.fn(),
      onScaleChange: jest.fn(),
      onMove: jest.fn(),
      onInterfaceTypeChange: jest.fn()
    }
    const state = {}
    const handlers = buildEditModeHandlers(mode, state)

    expect(Object.keys(handlers).sort()).toEqual([
      'click', 'interfacetypechange', 'keydown', 'keyup', 'move', 'pointerdown',
      'pointermove', 'pointerup', 'scalechange', 'touchend', 'touchmove', 'touchstart'
    ])
    handlers.keydown('event')
    handlers.pointerdown('down-event')
    handlers.pointermove('move-event')
    expect(mode.onKeydown).toHaveBeenCalledWith(state, 'event')
    // pointerdown/pointermove/pointerup all route through the single onPointerevent handler
    expect(mode.onPointerevent).toHaveBeenCalledWith(state, 'down-event')
    expect(mode.onPointerevent).toHaveBeenCalledWith(state, 'move-event')
  })

  test('binds extra per-mode handlers (e.g. nudge, selectionchange, update) alongside the base set', () => {
    const mode = { onNudgeVertex: jest.fn(), onSelectionChange: jest.fn() }
    const state = {}
    const handlers = buildEditModeHandlers(mode, state, { nudge: mode.onNudgeVertex, selectionchange: mode.onSelectionChange })

    handlers.nudge('e1')
    handlers.selectionchange('e2')
    expect(mode.onNudgeVertex).toHaveBeenCalledWith(state, 'e1')
    expect(mode.onSelectionChange).toHaveBeenCalledWith(state, 'e2')
  })
})
