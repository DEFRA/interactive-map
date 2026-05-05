import React from 'react'
import { render, cleanup, fireEvent } from '@testing-library/react'
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

const KEYBOARD_HINT_TEXT = 'Test keyboad hint text'

const mockMapProvider = { initMap: jest.fn(), updateMap: jest.fn(), clearHighlightedLabel: jest.fn() }

function setupHookMocks (mainEl, viewportEl) {
  useConfig.mockReturnValue({
    id: 'test-map',
    mapLabel: 'Test Map',
    keyboardHintText: KEYBOARD_HINT_TEXT,
    mapProvider: mockMapProvider
  })
  useApp.mockReturnValue({
    interfaceType: 'desktop',
    mode: 'default',
    previousMode: 'default',
    layoutRefs: { mainRef: { current: mainEl }, viewportRef: { current: viewportEl }, safeZoneRef: { current: null } },
    safeZoneInset: {},
    dispatch: jest.fn()
  })
  useMap.mockReturnValue({ mapSize: 'medium', dispatch: jest.fn() })
  useService.mockReturnValue({
    announce: jest.fn(),
    hints: { show: jest.fn(), dismiss: jest.fn(), subscribe: jest.fn(() => jest.fn()) },
    eventBus: { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
  })
  useKeyboardHint.mockImplementation(({ onViewportFocusChange }) => ({
    handleFocus: () => onViewportFocusChange(true),
    handleBlur: () => onViewportFocusChange(false)
  }))
  useKeyboardShortcuts.mockImplementation(() => {})
  useMapEvents.mockImplementation(() => {})
}

function renderViewport () {
  const { container, rerender } = render(<Viewport />)
  const viewport = container.querySelector('.im-c-viewport')
  const mapContainer = container.querySelector('.im-c-viewport__map-container')
  const safeZone = container.querySelector('.im-c-viewport__safezone')
  const crossHair = container.querySelector('[data-testid="cross-hair"]')
  const markers = container.querySelector('[data-testid="markers"]')
  return { container, viewport, mapContainer, safeZone, crossHair, markers, rerender }
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

  it('sets aria-describedby to the shared hints container id', () => {
    const { viewport } = renderViewport()
    expect(viewport).toHaveAttribute('aria-describedby', 'test-map-keyboard-desc')
  })

  it('calls hints.show() with keyboardHintText when viewport gains keyboard focus', () => {
    const { hints } = useService()
    renderViewport()
    const { onViewportFocusChange } = useKeyboardHint.mock.calls[0][0]
    onViewportFocusChange(true)
    expect(hints.show).toHaveBeenCalledWith(KEYBOARD_HINT_TEXT, { duration: 0 })
  })

  it('calls hints.dismiss() when viewport loses focus', () => {
    const { hints } = useService()
    renderViewport()
    const { onViewportFocusChange } = useKeyboardHint.mock.calls[0][0]
    onViewportFocusChange(false)
    expect(hints.dismiss).toHaveBeenCalled()
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
    renderViewport()
    expect(useKeyboardShortcuts).toHaveBeenCalled()
  })

  it('dispatches SET_LISTBOX_ACTIVE when interact:listboxcapable fires', () => {
    renderViewport()
    const { eventBus } = useService()
    const [, handler] = eventBus.on.mock.calls.find(([event]) => event === 'interact:listboxcapable')
    handler()
    const { dispatch } = useApp()
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LISTBOX_ACTIVE' })
  })

  it('calls mapProvider.clearHighlightedLabel on map:click', () => {
    const clearMock = jest.fn()
    useConfig.mockReturnValueOnce({ ...useConfig(), mapProvider: { ...mockMapProvider, clearHighlightedLabel: clearMock } })
    useMapEvents.mockImplementationOnce((handlers) => handlers['map:click']?.({}))
    renderViewport()
    expect(clearMock).toHaveBeenCalled()
  })

  it('calls hints.show() when the features listbox gains focus', () => {
    const { hints } = useService()
    const { container } = renderViewport()
    fireEvent.focus(container.querySelector('[role="listbox"]'))
    expect(hints.show).toHaveBeenCalledWith(KEYBOARD_HINT_TEXT, { duration: 0 })
  })

  it('calls hints.dismiss() when the features listbox loses focus', () => {
    const { hints } = useService()
    const { container } = renderViewport()
    fireEvent.blur(container.querySelector('[role="listbox"]'))
    expect(hints.dismiss).toHaveBeenCalled()
  })

  it('focuses viewport when mode changes', () => {
    const { viewport, rerender } = renderViewport()
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
