import { bindEditModeListeners, unbindEditModeListeners, clearActiveSnapIndicator } from './editModeEvents.js'
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
    const h = makeHandlers()

    bindEditModeListeners(state, map, h)

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', h.keydown, { capture: true })
    expect(window.addEventListener).toHaveBeenCalledWith('keyup', h.keyup, { capture: true })
    expect(window.addEventListener).toHaveBeenCalledWith('click', h.click)
    expect(state.container.addEventListener).toHaveBeenCalledWith('pointerdown', h.pointerdown)
    expect(state.container.addEventListener).toHaveBeenCalledWith('pointermove', h.pointermove)
    expect(state.container.addEventListener).toHaveBeenCalledWith('pointerup', h.pointerup)
    expect(state.container.addEventListener).toHaveBeenCalledWith('touchstart', h.touchstart, { passive: false })
    expect(state.container.addEventListener).toHaveBeenCalledWith('touchmove', h.touchmove, { passive: false })
    expect(state.container.addEventListener).toHaveBeenCalledWith('touchend', h.touchend, { passive: false })
    expect(map.on).toHaveBeenCalledWith('draw.scalechange', h.scalechange)
    expect(map.on).toHaveBeenCalledWith('move', h.move)
    expect(map.on).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, h.interfacetypechange)
    expect(map.on).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, h.nudge)

    window.addEventListener.mockRestore()
  })
})

describe('unbindEditModeListeners', () => {
  test('tears down the shared window/container listeners and map events, and re-enables dragPan', () => {
    const state = { container: document.createElement('div') }
    jest.spyOn(window, 'removeEventListener')
    jest.spyOn(state.container, 'removeEventListener')
    const map = makeMap()
    const h = makeHandlers()

    unbindEditModeListeners(state, map, h)

    expect(state.container.removeEventListener).toHaveBeenCalledWith('pointerdown', h.pointerdown)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('pointermove', h.pointermove)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('pointerup', h.pointerup)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('touchstart', h.touchstart)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('touchmove', h.touchmove)
    expect(state.container.removeEventListener).toHaveBeenCalledWith('touchend', h.touchend)
    expect(map.off).toHaveBeenCalledWith('draw.scalechange', h.scalechange)
    expect(map.off).toHaveBeenCalledWith('move', h.move)
    expect(map.off).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, h.interfacetypechange)
    expect(map.off).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, h.nudge)
    expect(map.dragPan.enable).toHaveBeenCalled()
    expect(window.removeEventListener).toHaveBeenCalledWith('click', h.click)
    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', h.keydown, { capture: true })
    expect(window.removeEventListener).toHaveBeenCalledWith('keyup', h.keyup, { capture: true })

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
