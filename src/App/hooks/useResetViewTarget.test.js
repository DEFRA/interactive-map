import { renderHook } from '@testing-library/react'
import { useResetViewTarget, RESET_MOVE_WINDOW_MS } from './useResetViewTarget'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'

jest.mock('../store/configContext.js')
jest.mock('../store/appContext.js')
jest.mock('../store/mapContext.js')
jest.mock('../store/serviceContext.js')

const STORAGE_KEY = 'map:resetViewTarget'

describe('useResetViewTarget', () => {
  let viewport, dispatch, eventBus, handlers, mapProvider

  const settledState = { center: [1, 2], zoom: 10 }
  const setTargetAction = (payload) => ({ type: 'SET_RESET_VIEW_TARGET', payload })
  const clearTargetAction = { type: 'CLEAR_RESET_VIEW_TARGET' }
  const lastAction = () => dispatch.mock.calls.at(-1)?.[0]
  const lastTarget = () => lastAction()?.payload
  const reset = () => handlers['map:resetview']()
  const moveStart = () => handlers['map:movestart']()
  const moveEnd = (state = settledState) => handlers['map:moveend'](state)
  const firstIdle = (state = settledState) => handlers['map:firstidle'](state)
  const loadFromURL = () => globalThis.history.replaceState(null, '', '/?map:center=1,2&map:zoom=10')

  beforeEach(() => {
    jest.useFakeTimers()
    viewport = document.createElement('div')
    document.body.appendChild(viewport)
    dispatch = jest.fn()
    handlers = {}
    eventBus = {
      on: jest.fn((name, handler) => { handlers[name] = handler }),
      off: jest.fn()
    }
    mapProvider = {
      getCenter: jest.fn(() => [3, 4]),
      getZoom: jest.fn(() => 8),
      mapToScreen: ([x, y]) => ({ x: x * 10, y: y * 10 })
    }
    useConfig.mockReturnValue({ id: 'map', mapProvider })
    useApp.mockReturnValue({ layoutRefs: { viewportRef: { current: viewport } } })
    useMap.mockReturnValue({ dispatch })
    useService.mockReturnValue({ eventBus })
  })

  afterEach(() => {
    viewport.remove()
    globalThis.sessionStorage.clear()
    globalThis.history.replaceState(null, '', '/')
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it('does nothing without a map provider or viewport', () => {
    useConfig.mockReturnValue({ id: 'map', mapProvider: null })
    renderHook(() => useResetViewTarget())
    useConfig.mockReturnValue({ id: 'map', mapProvider })
    useApp.mockReturnValue({ layoutRefs: { viewportRef: { current: null } } })
    renderHook(() => useResetViewTarget())
    expect(eventBus.on).not.toHaveBeenCalled()
  })

  describe('on load', () => {
    it('sets and saves the target when the map loaded at its configured view', () => {
      renderHook(() => useResetViewTarget())
      firstIdle()
      expect(dispatch).toHaveBeenCalledWith(setTargetAction(settledState))
      expect(JSON.parse(globalThis.sessionStorage.getItem(STORAGE_KEY))).toEqual(settledState)
    })

    it('ignores the URL when urlPosition is none', () => {
      loadFromURL()
      useConfig.mockReturnValue({ id: 'map', mapProvider, urlPosition: 'none' })
      renderHook(() => useResetViewTarget())
      firstIdle()
      expect(lastTarget()).toEqual(settledState)
    })

    it('uses the saved target when the view from the URL is where the last reset went', () => {
      loadFromURL()
      globalThis.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settledState))
      renderHook(() => useResetViewTarget())
      firstIdle()
      expect(lastTarget()).toEqual(settledState)
    })

    it('has no target when the view from the URL is somewhere else', () => {
      loadFromURL()
      globalThis.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ center: [5, 5], zoom: 10 }))
      renderHook(() => useResetViewTarget())
      firstIdle()
      expect(lastTarget()).toBeNull()
    })

    it.each([
      ['nothing is saved', null],
      ['the saved target is not valid', '{"center":"1,2"}'],
      ['the saved target is not JSON', 'not json']
    ])('has no target with a view from the URL when %s', (_case, saved) => {
      loadFromURL()
      if (saved) {
        globalThis.sessionStorage.setItem(STORAGE_KEY, saved)
      }
      renderHook(() => useResetViewTarget())
      firstIdle()
      expect(lastTarget()).toBeNull()
    })

    it('ignores a first idle without a state', () => {
      renderHook(() => useResetViewTarget())
      firstIdle(null)
      expect(dispatch).not.toHaveBeenCalled()
    })
  })

  describe('on reset', () => {
    it('marks the target as not known while the reset is in progress', () => {
      renderHook(() => useResetViewTarget())
      reset()
      expect(dispatch).toHaveBeenCalledWith(clearTargetAction)
    })

    it('sets and saves the target where the map settles after a reset', () => {
      renderHook(() => useResetViewTarget())
      reset()
      moveStart()
      moveEnd()
      expect(lastTarget()).toEqual(settledState)
      expect(JSON.parse(globalThis.sessionStorage.getItem(STORAGE_KEY))).toEqual(settledState)
    })

    it('ignores move ends that are not from a reset, or have no state', () => {
      renderHook(() => useResetViewTarget())
      moveStart()
      moveEnd()
      expect(dispatch).not.toHaveBeenCalled()
      reset()
      moveStart()
      moveEnd(null)
      expect(lastAction()).toEqual(clearTargetAction)
    })

    it('sets the target to the current view when a reset does not move the map', () => {
      renderHook(() => useResetViewTarget())
      reset()
      jest.advanceTimersByTime(RESET_MOVE_WINDOW_MS)
      expect(lastTarget()).toEqual({ center: [3, 4], zoom: 8 })
    })

    it('waits for the move to end when a reset moves the map', () => {
      renderHook(() => useResetViewTarget())
      reset()
      moveStart()
      jest.advanceTimersByTime(RESET_MOVE_WINDOW_MS)
      expect(lastAction()).toEqual(clearTargetAction)
      moveEnd()
      expect(lastTarget()).toEqual(settledState)
    })

    it.each(['pointerdown', 'wheel', 'keydown'])('has no target when the user takes over a reset with a %s on the map', (type) => {
      renderHook(() => useResetViewTarget())
      reset()
      moveStart()
      viewport.dispatchEvent(new Event(type))
      moveEnd()
      jest.advanceTimersByTime(RESET_MOVE_WINDOW_MS)
      expect(lastTarget()).toBeNull()
      expect(dispatch).toHaveBeenCalledTimes(2)
    })

    it('ignores map input when no reset is in progress', () => {
      renderHook(() => useResetViewTarget())
      viewport.dispatchEvent(new Event('pointerdown'))
      expect(dispatch).not.toHaveBeenCalled()
    })

    it('restarts the wait when reset again', () => {
      renderHook(() => useResetViewTarget())
      reset()
      jest.advanceTimersByTime(RESET_MOVE_WINDOW_MS - 1)
      reset()
      jest.advanceTimersByTime(RESET_MOVE_WINDOW_MS - 1)
      expect(lastAction()).toEqual(clearTargetAction)
      jest.advanceTimersByTime(1)
      expect(lastTarget()).toEqual({ center: [3, 4], zoom: 8 })
    })

    it('still sets the target when session storage is blocked', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
      renderHook(() => useResetViewTarget())
      firstIdle()
      expect(lastTarget()).toEqual(settledState)
    })
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useResetViewTarget())
    reset()
    dispatch.mockClear()
    unmount()
    jest.advanceTimersByTime(RESET_MOVE_WINDOW_MS)
    viewport.dispatchEvent(new Event('pointerdown'))
    expect(dispatch).not.toHaveBeenCalled()
    expect(eventBus.off).toHaveBeenCalledWith('map:resetview', expect.any(Function))
    expect(eventBus.off).toHaveBeenCalledWith('map:firstidle', expect.any(Function))
  })
})
