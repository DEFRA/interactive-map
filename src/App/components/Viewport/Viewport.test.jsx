import React from 'react'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { Viewport } from './Viewport.jsx'
import { useConfig } from '../../store/configContext.js'
import { useApp } from '../../store/appContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { useKeyboardHint } from '../../hooks/useKeyboardHint.js'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js'
import { useMapEvents } from '../../hooks/useMapEvents.js'

// ---------------------------
// Mock dependencies
// ---------------------------
jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/appContext.js', () => ({ useApp: jest.fn() }))
jest.mock('../../store/mapContext.js', () => ({ useMap: jest.fn() }))
jest.mock('../../store/serviceContext.js', () => ({ useService: jest.fn() }))
jest.mock('../../hooks/useKeyboardShortcuts.js', () => ({ useKeyboardShortcuts: jest.fn() }))
jest.mock('../../hooks/useKeyboardHint.js', () => ({ useKeyboardHint: jest.fn() }))
jest.mock('../../hooks/useMapEvents.js', () => ({ useMapEvents: jest.fn() }))
jest.mock('../CrossHair/CrossHair', () => ({ CrossHair: jest.fn(() => <div data-testid='cross-hair' />) }))
jest.mock('../Markers/Markers', () => ({ Markers: jest.fn(() => <div data-testid='markers' />) }))

describe('Viewport', () => {
  let keyboardHintPortalRef
  const mockMapProvider = { initMap: jest.fn(), updateMap: jest.fn(), clearHighlightedLabel: jest.fn() }

  beforeEach(() => {
    cleanup()
    jest.clearAllMocks()

    keyboardHintPortalRef = { current: document.createElement('div') }
    document.body.appendChild(keyboardHintPortalRef.current)

    // ---------------------------
    // Hook mocks
    // ---------------------------
    useConfig.mockReturnValue({
      id: 'test-map',
      mapLabel: 'Test Map',
      keyboardHintText: 'Press arrow keys',
      mapProvider: mockMapProvider
    })

    useApp.mockReturnValue({
      interfaceType: 'desktop',
      mode: 'default',
      previousMode: 'default',
      layoutRefs: { viewportRef: { current: null }, mainRef: { current: null }, safeZoneRef: { current: null } },
      safeZoneInset: {}
    })

    useMap.mockReturnValue({
      mapSize: 'medium',
      dispatch: jest.fn()
    })

    useService.mockReturnValue({
      announce: jest.fn(),
      eventBus: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      }
    })

    useKeyboardHint.mockImplementation(({ onViewportFocusChange }) => ({
      showHint: true,
      handleFocus: () => onViewportFocusChange(true),
      handleBlur: () => onViewportFocusChange(false)
    }))

    useKeyboardShortcuts.mockImplementation(() => {})
    useMapEvents.mockImplementation(() => {})
  })

  afterEach(() => document.body.removeChild(keyboardHintPortalRef.current))

  const renderViewport = () => {
    const { container, rerender, unmount } = render(<Viewport keyboardHintPortalRef={keyboardHintPortalRef} />)
    const viewport = container.querySelector('.im-c-viewport')
    const mapContainer = container.querySelector('.im-c-viewport__map-container')
    const safeZone = container.querySelector('.im-c-viewport__safezone')
    const keyboardHint = keyboardHintPortalRef.current.querySelector('.im-c-viewport__keyboard-hint')
    const crossHair = container.querySelector('[data-testid="cross-hair"]')
    const markers = container.querySelector('[data-testid="markers"]')
    return { viewport, mapContainer, safeZone, keyboardHint, crossHair, markers, rerender, unmount }
  }

  it('renders viewport, map container, safe zone, CrossHair, and Markers', () => {
    const { viewport, mapContainer, safeZone, crossHair, markers } = renderViewport()
    expect(viewport).toBeInTheDocument()
    expect(mapContainer).toBeInTheDocument()
    expect(safeZone).toBeInTheDocument()
    expect(crossHair).toBeInTheDocument()
    expect(markers).toBeInTheDocument()
  })

  it('renders viewport with correct id and class based on mapSize', () => {
    const { viewport } = renderViewport()
    expect(viewport.id).toBe('test-map-viewport')
    expect(viewport).toHaveClass('im-c-viewport--medium')
  })

  it('renders keyboard hint when showHint is true', () => {
    const { keyboardHint } = renderViewport()
    expect(keyboardHint).toBeInTheDocument()
    expect(keyboardHint.innerHTML).toBe('Press arrow keys')
  })

  it('handles focus and blur events updating keyboard hint visibility', () => {
    const { viewport, keyboardHint } = renderViewport()
    fireEvent.focus(viewport)
    fireEvent.blur(viewport)
    expect(keyboardHint).toBeInTheDocument()
    expect(keyboardHint.innerHTML).toBe('Press arrow keys')
  })

  it('attaches keyboard shortcuts', () => {
    renderViewport()
    expect(useKeyboardShortcuts).toHaveBeenCalled()
  })

  it('calls mapProvider.clearHighlightedLabel on map:click', () => {
    const clearMock = jest.fn()
    useConfig.mockReturnValueOnce({ ...useConfig(), mapProvider: { ...mockMapProvider, clearHighlightedLabel: clearMock } })
    useMapEvents.mockImplementationOnce((handlers) => handlers['map:click']?.({}))
    renderViewport()
    expect(clearMock).toHaveBeenCalled()
  })

  it('focuses viewport when mode changes', () => {
    const { viewport, rerender } = renderViewport()
    const focusMock = jest.spyOn(viewport, 'focus')
    useApp.mockReturnValueOnce({
      interfaceType: 'desktop',
      mode: 'edit',
      previousMode: 'default',
      layoutRefs: { viewportRef: { current: viewport }, mainRef: { current: null }, safeZoneRef: { current: null } },
      safeZoneInset: {}
    })
    rerender(<Viewport keyboardHintPortalRef={keyboardHintPortalRef} />)
    expect(focusMock).toHaveBeenCalled()
  })

  it('toggles main element class for keyboard hint and cleans up on unmount', () => {
    const mainEl = document.createElement('div')
    useApp.mockReturnValueOnce({
      interfaceType: 'desktop',
      mode: 'default',
      previousMode: 'default',
      layoutRefs: { viewportRef: { current: null }, mainRef: { current: mainEl }, safeZoneRef: { current: null } },
      safeZoneInset: {}
    })
    const { unmount } = renderViewport()
    expect(mainEl.classList.contains('im-o-app__main--keyboard-hint-visible')).toBe(true)
    unmount()
    expect(mainEl.classList.contains('im-o-app__main--keyboard-hint-visible')).toBe(false)
  })
})
