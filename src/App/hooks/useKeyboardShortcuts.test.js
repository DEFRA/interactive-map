import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { keyboardMappings } from '../controls/keyboardMappings.js'
import { createKeyboardActions } from '../controls/keyboardActions.js'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'

jest.mock('../controls/keyboardMappings.js')
jest.mock('../controls/keyboardActions.js')
jest.mock('../store/configContext.js')
jest.mock('../store/appContext.js')
jest.mock('../store/mapContext.js')
jest.mock('../store/serviceContext.js')

const setup = (overrides = {}) => {
  const appContainerRef = { current: document.createElement('div') }
  useConfig.mockReturnValue({
    mapProvider: 'google',
    reverseGeocode: { showMarker: true },
    panDelta: 10,
    nudgePanDelta: 1,
    zoomDelta: 1,
    nudgeZoomDelta: 0.1,
    readMapText: jest.fn(),
    ...overrides.config
  })
  useApp.mockReturnValue({ interfaceType: 'keyboard', dispatch: jest.fn(), layoutRefs: { appContainerRef }, ...overrides.app })
  useMap.mockReturnValue({ crossHair: { lat: 0, lng: 0 }, ...overrides.map })
  useService.mockReturnValue({ announce: jest.fn(), ...overrides.service })

  const actions = { zoomIn: jest.fn(), panUp: jest.fn(), ...overrides.actions }
  createKeyboardActions.mockReturnValue(actions)
  keyboardMappings.keydown = overrides.keydown || {}
  keyboardMappings.keyup = overrides.keyup || {}

  return { containerRef: { current: document.createElement('div') }, appContainerRef, actions }
}

describe('useKeyboardShortcuts', () => {
  beforeEach(jest.clearAllMocks)

  test('early returns when no container or not keyboard interface', () => {
    setup()
    renderHook(() => useKeyboardShortcuts({ current: null }))
    expect(createKeyboardActions).not.toHaveBeenCalled()

    setup({ app: { interfaceType: 'mouse' } })
    renderHook(() => useKeyboardShortcuts({ current: document.createElement('div') }))
    expect(createKeyboardActions).not.toHaveBeenCalled()
  })

  test('creates actions with correct config', () => {
    const dispatch = jest.fn(); const announce = jest.fn()
    const readMapText = jest.fn()
    setup({
      config: {
        mapProvider: 'mapbox',
        panDelta: 20,
        nudgePanDelta: 2,
        zoomDelta: 2,
        nudgeZoomDelta: 0.2,
        readMapText
      },
      app: { dispatch },
      service: { announce }
    })
    const { containerRef } = setup({
      config: {
        mapProvider: 'mapbox',
        panDelta: 20,
        nudgePanDelta: 2,
        zoomDelta: 2,
        nudgeZoomDelta: 0.2,
        readMapText
      },
      app: { dispatch },
      service: { announce }
    })

    renderHook(() => useKeyboardShortcuts(containerRef))

    expect(createKeyboardActions).toHaveBeenCalledWith('mapbox', announce,
      expect.objectContaining({
        dispatch,
        panDelta: 20,
        nudgePanDelta: 2,
        zoomDelta: 2,
        nudgeZoomDelta: 0.2,
        readMapText
      }))
  })

  test('normalizes letter keys using e.code and other keys using e.key', () => {
    const { containerRef, actions } = setup({ keydown: { I: 'zoomIn', ArrowUp: 'panUp' } })
    renderHook(() => useKeyboardShortcuts(containerRef))

    containerRef.current.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', key: 'i' }))
    expect(actions.zoomIn).toHaveBeenCalled()

    containerRef.current.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(actions.panUp).toHaveBeenCalled()
  })

  test('normalizes numpad Add/Subtract to +/-', () => {
    const { containerRef, actions } = setup({
      keydown: { '+': 'zoomIn', '-': 'zoomOut' },
      actions: { zoomIn: jest.fn(), zoomOut: jest.fn() }
    })
    renderHook(() => useKeyboardShortcuts(containerRef))

    const addKeys = ['Add', 'NumpadAdd']
    addKeys.forEach(key =>
      containerRef.current.dispatchEvent(new KeyboardEvent('keydown', { key })))
    expect(actions.zoomIn).toHaveBeenCalledTimes(2)

    const subtractKeys = ['Subtract', 'NumpadSubtract']
    subtractKeys.forEach(key =>
      containerRef.current.dispatchEvent(new KeyboardEvent('keydown', { key })))
    expect(actions.zoomOut).toHaveBeenCalledTimes(2)
  })

  test('handles Alt+key combinations and keyup events', () => {
    const { containerRef, appContainerRef, actions } = setup({
      keydown: { 'Alt+S': 'search' },
      keyup: { ArrowUp: 'stopPan' },
      actions: { search: jest.fn(), stopPan: jest.fn() }
    })
    renderHook(() => useKeyboardShortcuts(containerRef))

    containerRef.current.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', altKey: true }))
    expect(actions.search).toHaveBeenCalled()

    appContainerRef.current.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }))
    expect(actions.stopPan).toHaveBeenCalled()
  })

  test('prevents default when action exists, does nothing otherwise', () => {
    const { containerRef } = setup({ keydown: { I: 'zoomIn', X: 'nonExistent' } })
    renderHook(() => useKeyboardShortcuts(containerRef))

    const evt1 = new KeyboardEvent('keydown', { code: 'KeyI', key: 'i' })
    const spy1 = jest.spyOn(evt1, 'preventDefault')
    containerRef.current.dispatchEvent(evt1)
    expect(spy1).toHaveBeenCalled()

    const evt2 = new KeyboardEvent('keydown', { key: 'Z' })
    const spy2 = jest.spyOn(evt2, 'preventDefault')
    containerRef.current.dispatchEvent(evt2)
    expect(spy2).not.toHaveBeenCalled()

    const evt3 = new KeyboardEvent('keydown', { key: 'X' })
    const spy3 = jest.spyOn(evt3, 'preventDefault')
    containerRef.current.dispatchEvent(evt3)
    expect(spy3).not.toHaveBeenCalled()
  })

  test('cleanup removes event listeners', () => {
    const { containerRef, appContainerRef } = setup()
    const viewportSpy = jest.spyOn(containerRef.current, 'removeEventListener')
    const appSpy = jest.spyOn(appContainerRef.current, 'removeEventListener')
    const { unmount } = renderHook(() => useKeyboardShortcuts(containerRef))
    unmount()
    expect(viewportSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(appSpy).toHaveBeenCalledWith('keyup', expect.any(Function))
  })
})
