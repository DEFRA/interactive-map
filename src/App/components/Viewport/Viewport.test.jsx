import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { Viewport } from './Viewport.jsx'
import { useConfig } from '../../store/configContext.js'
import { useApp } from '../../store/appContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { useKeyboardHint } from '../../hooks/useKeyboardHint.js'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js'
import { useMapEvents } from '../../hooks/useMapEvents.js'

jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/appContext.js', () => ({ useApp: jest.fn() }))
jest.mock('../../store/mapContext.js', () => ({ useMap: jest.fn() }))
jest.mock('../../store/serviceContext.js', () => ({ useService: jest.fn() }))
jest.mock('../../hooks/useKeyboardShortcuts.js', () => ({ useKeyboardShortcuts: jest.fn() }))
jest.mock('../../hooks/useKeyboardHint.js', () => ({ useKeyboardHint: jest.fn() }))
jest.mock('../../hooks/useMapEvents.js', () => ({ useMapEvents: jest.fn() }))
jest.mock('../CrossHair/CrossHair', () => ({ CrossHair: jest.fn(() => <div data-testid='cross-hair' />) }))
jest.mock('../Markers/Markers', () => ({ Markers: jest.fn(() => <div data-testid='markers' />) }))

const mockMapProvider = { initMap: jest.fn(), updateMap: jest.fn(), clearHighlightedLabel: jest.fn() }

function setupHookMocks (mainEl, viewportEl) {
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
    layoutRefs: { mainRef: { current: mainEl }, viewportRef: { current: viewportEl }, safeZoneRef: { current: null } },
    safeZoneInset: {}
  })
  useMap.mockReturnValue({ mapSize: 'medium', dispatch: jest.fn() })
  useService.mockReturnValue({ announce: jest.fn(), eventBus: { on: jest.fn(), off: jest.fn(), emit: jest.fn() } })
  useKeyboardHint.mockImplementation(({ onViewportFocusChange }) => ({
    showHint: true,
    handleFocus: () => onViewportFocusChange(true),
    handleBlur: () => onViewportFocusChange(false)
  }))
  useKeyboardShortcuts.mockImplementation(() => {})
  useMapEvents.mockImplementation(() => {})
}

function renderViewport (mainEl) {
  const { container, rerender } = render(<Viewport />)
  const viewport = container.querySelector('.im-c-viewport')
  const mapContainer = container.querySelector('.im-c-viewport__map-container')
  const safeZone = container.querySelector('.im-c-viewport__safezone')
  const keyboardHint = mainEl.querySelector('.im-c-viewport__keyboard-hint')
  const crossHair = container.querySelector('[data-testid="cross-hair"]')
  const markers = container.querySelector('[data-testid="markers"]')
  return { viewport, mapContainer, safeZone, keyboardHint, crossHair, markers, rerender }
}

describe('Viewport rendering', () => {
  let viewportEl, mainEl

  beforeEach(() => {
    cleanup()
    jest.clearAllMocks()
    viewportEl = document.createElement('div')
    mainEl = document.createElement('div')
    document.body.appendChild(viewportEl)
    document.body.appendChild(mainEl)
    setupHookMocks(mainEl, viewportEl)
  })

  afterEach(() => {
    viewportEl.remove()
    mainEl.remove()
  })

  it('renders viewport, map container, safe zone, CrossHair, and Markers', () => {
    const { viewport, mapContainer, safeZone, crossHair, markers } = renderViewport(mainEl)
    expect(viewport).toBeInTheDocument()
    expect(mapContainer).toBeInTheDocument()
    expect(safeZone).toBeInTheDocument()
    expect(crossHair).toBeInTheDocument()
    expect(markers).toBeInTheDocument()
  })

  it('renders viewport with correct id and class based on mapSize', () => {
    const { viewport } = renderViewport(mainEl)
    expect(viewport.id).toBe('test-map-viewport')
    expect(viewport).toHaveClass('im-c-viewport--medium')
  })

  it('renders keyboard hint when showHint is true', () => {
    const { viewport, keyboardHint } = renderViewport(mainEl)
    expect(keyboardHint).toBeInTheDocument()
    expect(keyboardHint.innerHTML).toBe('Press arrow keys')
    expect(keyboardHint.id).toBe('test-map-keyboard-hint')
    expect(keyboardHint).not.toHaveClass('im-u-visually-hidden')
    expect(viewport).toHaveAttribute('aria-describedby', 'test-map-keyboard-hint')
  })

  it('applies visually-hidden class to keyboard hint when showHint is false', () => {
    useKeyboardHint.mockImplementation(({ onViewportFocusChange }) => ({
      showHint: false,
      handleFocus: () => onViewportFocusChange(true),
      handleBlur: () => onViewportFocusChange(false)
    }))
    const { keyboardHint } = renderViewport(mainEl)
    expect(keyboardHint).toBeInTheDocument()
    expect(keyboardHint).toHaveClass('im-u-visually-hidden')
  })
})

describe('Viewport interactions', () => {
  let viewportEl, mainEl

  beforeEach(() => {
    cleanup()
    jest.clearAllMocks()
    viewportEl = document.createElement('div')
    mainEl = document.createElement('div')
    document.body.appendChild(viewportEl)
    document.body.appendChild(mainEl)
    setupHookMocks(mainEl, viewportEl)
  })

  afterEach(() => {
    viewportEl.remove()
    mainEl.remove()
  })

  it('attaches keyboard shortcuts', () => {
    renderViewport(mainEl)
    expect(useKeyboardShortcuts).toHaveBeenCalled()
  })

  it('calls mapProvider.clearHighlightedLabel on map:click', () => {
    const clearMock = jest.fn()
    useConfig.mockReturnValueOnce({ ...useConfig(), mapProvider: { ...mockMapProvider, clearHighlightedLabel: clearMock } })
    useMapEvents.mockImplementationOnce((handlers) => handlers['map:click']?.({}))
    renderViewport(mainEl)
    expect(clearMock).toHaveBeenCalled()
  })

  it('focuses viewport when mode changes', () => {
    const { viewport, rerender } = renderViewport(mainEl)
    const focusMock = jest.spyOn(viewport, 'focus')
    useApp.mockReturnValueOnce({
      interfaceType: 'desktop',
      mode: 'edit',
      previousMode: 'default',
      layoutRefs: { mainRef: { current: mainEl }, viewportRef: { current: viewport }, safeZoneRef: { current: null } },
      safeZoneInset: {}
    })
    rerender(<Viewport />)
    expect(focusMock).toHaveBeenCalled()
  })
})
