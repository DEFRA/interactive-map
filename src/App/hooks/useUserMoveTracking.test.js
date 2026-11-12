import { renderHook } from '@testing-library/react'
import { useUserMoveTracking, USER_INPUT_WINDOW_MS } from './useUserMoveTracking'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'

jest.mock('../store/configContext.js')
jest.mock('../store/appContext.js')
jest.mock('../store/mapContext.js')
jest.mock('../store/serviceContext.js')

describe('useUserMoveTracking', () => {
  let container, dispatch, eventBus, handlers

  const moveStart = () => handlers['map:movestart']()
  // mapState.isUserMove: false until the first change is sent
  const lastIsUserMove = () => dispatch.mock.calls.at(-1)?.[0].payload.isUserMove ?? false

  beforeEach(() => {
    jest.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    dispatch = jest.fn()
    handlers = {}
    eventBus = {
      on: jest.fn((name, handler) => { handlers[name] = handler }),
      off: jest.fn()
    }
    useConfig.mockReturnValue({ mapProvider: {} })
    useApp.mockReturnValue({ layoutRefs: { appContainerRef: { current: container } } })
    useMap.mockReturnValue({ dispatch })
    useService.mockReturnValue({ eventBus })
  })

  afterEach(() => {
    container.remove()
    jest.useRealTimers()
  })

  it('marks a move as code-made when there was no user input, without sending the unchanged value', () => {
    renderHook(() => useUserMoveTracking())
    moveStart()
    expect(lastIsUserMove()).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('only sends isUserMove when it changes', () => {
    renderHook(() => useUserMoveTracking())
    container.dispatchEvent(new Event('wheel'))
    moveStart()
    moveStart()
    moveStart()
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({ type: 'MAP_MOVE_START', payload: { isUserMove: true } })

    jest.advanceTimersByTime(USER_INPUT_WINDOW_MS + 1)
    moveStart()
    moveStart()
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(lastIsUserMove()).toBe(false)
  })

  it.each(['wheel', 'keydown', 'keyup'])('marks a move straight after a %s as the user\'s', (type) => {
    renderHook(() => useUserMoveTracking())
    container.dispatchEvent(new Event(type, { bubbles: true }))
    moveStart()
    expect(lastIsUserMove()).toBe(true)
  })

  it('stops counting input once the window has passed', () => {
    renderHook(() => useUserMoveTracking())
    container.dispatchEvent(new Event('wheel'))
    jest.advanceTimersByTime(USER_INPUT_WINDOW_MS + 1)
    moveStart()
    expect(lastIsUserMove()).toBe(false)
  })

  it('counts moves while the pointer is down, however long the drag, until it\'s released', () => {
    renderHook(() => useUserMoveTracking())
    container.dispatchEvent(new Event('pointerdown'))
    jest.advanceTimersByTime(USER_INPUT_WINDOW_MS * 4)
    moveStart()
    expect(lastIsUserMove()).toBe(true)

    document.dispatchEvent(new Event('pointerup'))
    jest.advanceTimersByTime(USER_INPUT_WINDOW_MS + 1)
    moveStart()
    expect(lastIsUserMove()).toBe(false)
  })

  it('ignores input outside the app', () => {
    renderHook(() => useUserMoveTracking())
    document.body.dispatchEvent(new Event('keydown'))
    moveStart()
    expect(lastIsUserMove()).toBe(false)
  })

  it('does nothing without a map provider or app container', () => {
    useConfig.mockReturnValue({ mapProvider: null })
    renderHook(() => useUserMoveTracking())
    useConfig.mockReturnValue({ mapProvider: {} })
    useApp.mockReturnValue({ layoutRefs: { appContainerRef: { current: null } } })
    renderHook(() => useUserMoveTracking())
    expect(eventBus.on).not.toHaveBeenCalled()
  })

  it('removes its listeners on unmount', () => {
    const { unmount } = renderHook(() => useUserMoveTracking())
    const moveStartHandler = handlers['map:movestart']
    unmount()
    expect(eventBus.off).toHaveBeenCalledWith('map:movestart', moveStartHandler)
    container.dispatchEvent(new Event('wheel'))
    moveStartHandler()
    expect(lastIsUserMove()).toBe(false)
  })
})
