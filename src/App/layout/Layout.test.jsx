import React from 'react'
import { render, screen } from '@testing-library/react'
import { Layout } from './Layout'

import { useConfig } from '../store/configContext'
import { useApp } from '../store/appContext'
import { useMap } from '../store/mapContext'
import { useLayoutMeasurements } from '../hooks/useLayoutMeasurements'
import { useFocusVisible } from '../hooks/useFocusVisible'

// Mock child components to simplify
jest.mock('../components/Viewport/Viewport', () => ({
  Viewport: jest.fn(() => <div data-testid='viewport' />)
}))
jest.mock('../components/Logo/Logo', () => ({
  Logo: jest.fn(() => <div data-testid='logo' />)
}))
jest.mock('../components/Attributions/Attributions', () => ({
  Attributions: jest.fn(() => <div data-testid='attributions' />)
}))
jest.mock('../renderer/SlotRenderer', () => ({
  SlotRenderer: jest.fn(({ slot }) => <div data-testid={`slot-${slot.toLowerCase()}`} />)
}))
jest.mock('../components/Hints/Hints', () => ({
  Hints: jest.fn(() => null)
}))

// Mock hooks
jest.mock('../store/configContext', () => ({ useConfig: jest.fn() }))
jest.mock('../store/appContext', () => ({ useApp: jest.fn() }))
jest.mock('../store/mapContext', () => ({ useMap: jest.fn() }))
jest.mock('../hooks/useLayoutMeasurements', () => ({ useLayoutMeasurements: jest.fn() }))
jest.mock('../hooks/useFocusVisible', () => ({ useFocusVisible: jest.fn() }))
jest.mock('../hooks/useApplicationModeFocus.js', () => ({ useApplicationModeFocus: jest.fn() }))

describe('Layout', () => {
  const mockRefs = {
    appContainerRef: React.createRef(),
    mainRef: React.createRef(),
    headerRef: React.createRef(),
    bannerRef: React.createRef(),
    topRef: React.createRef(),
    topLeftColRef: React.createRef(),
    topRightColRef: React.createRef(),
    rightRef: React.createRef(),
    bottomRef: React.createRef(),
    actionsRef: React.createRef()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    useConfig.mockReturnValue({ id: 'myApp' })
    useApp.mockReturnValue({
      breakpoint: 'desktop',
      interfaceType: 'map',
      preferredColorScheme: 'dark',
      layoutRefs: mockRefs,
      isLayoutReady: true,
      applicationModeEntries: [{ id: 'search', include: null, exclude: null }],
      isFullscreen: false
    })
    useMap.mockReturnValue({
      mapStyle: {
        appColorScheme: 'light',
        mapColorScheme: 'dark',
        backgroundColor: 'pink'
      }
    })
  })

  test('renders layout with correct class names, children and fullscreen=false', () => {
    render(<Layout />)

    const root = document.getElementById('myApp-im-app')
    expect(root).toBeInTheDocument()
    expect(root.className).toContain('im-o-app--desktop')
    expect(root.className).toContain('im-o-app--map')
    expect(root.className).toContain('im-o-app--inline')
    expect(root.className).toContain('im-o-app--light-app')
    expect(root.className).toContain('im-o-app--mode-search')
    expect(root.style.backgroundColor).toBe('pink')
    expect(root.style.getPropertyValue('--map-overlay-halo-color')).toBe('#0b0c0c')
    expect(root.style.getPropertyValue('--map-overlay-selected-color')).toBe('#ffffff')
    expect(root.style.getPropertyValue('--map-overlay-foreground-color')).toBe('#ffffff')

    const overlay = root.querySelector('.im-o-app__overlay')
    expect(overlay.className).not.toContain('not-ready')

    expect(screen.getByTestId('viewport')).toBeInTheDocument()
    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(screen.getByTestId('attributions')).toBeInTheDocument()

    expect(screen.getByTestId('slot-side')).toBeInTheDocument()
    expect(screen.getByTestId('slot-header')).toBeInTheDocument()
    expect(screen.getByTestId('slot-banner')).toBeInTheDocument()
    expect(screen.getByTestId('slot-top-left')).toBeInTheDocument()
    expect(screen.getByTestId('slot-bottom-right')).toBeInTheDocument()
    expect(screen.getByTestId('slot-modal')).toBeInTheDocument()

    const backdrop = root.querySelector('.im-o-app__modal-backdrop')
    expect(backdrop).toBeInTheDocument()
    expect(backdrop).not.toHaveClass('im-o-app__modal-backdrop--visible')
  })

  test('adds the class for the most recently set active mode only', () => {
    useApp.mockReturnValueOnce({
      breakpoint: 'desktop',
      interfaceType: 'map',
      preferredColorScheme: 'dark',
      layoutRefs: mockRefs,
      isLayoutReady: true,
      applicationModeEntries: [
        { id: 'draw', include: [], exclude: null },
        { id: 'search', include: null, exclude: null }
      ],
      isFullscreen: false
    })
    render(<Layout />)
    const root = document.getElementById('myApp-im-app')
    expect(root).toHaveClass('im-o-app--mode-search')
    expect(root).not.toHaveClass('im-o-app--mode-draw')
  })

  test('adds no class for a mode the consumer\'s config disables', () => {
    useApp.mockReturnValueOnce({
      breakpoint: 'desktop',
      interfaceType: 'map',
      preferredColorScheme: 'dark',
      layoutRefs: mockRefs,
      isLayoutReady: true,
      applicationModeEntries: [{ id: 'draw', include: [], exclude: null }],
      isFullscreen: false
    })
    useConfig.mockReturnValueOnce({ id: 'myApp', applicationModes: { draw: false } })
    render(<Layout />)
    expect(document.getElementById('myApp-im-app').className).not.toContain('im-o-app--mode-')
  })

  test('shows the modal backdrop only while a modal-configured panel is open', () => {
    useApp.mockReturnValue({
      breakpoint: 'mobile',
      interfaceType: 'map',
      preferredColorScheme: 'dark',
      layoutRefs: mockRefs,
      isLayoutReady: true,
      applicationModeEntries: [],
      isFullscreen: true,
      openPanels: { settings: { props: {} } },
      panelConfig: { settings: { mobile: { modal: true } } }
    })
    render(<Layout />)
    const root = document.getElementById('myApp-im-app')
    expect(root.querySelector('.im-o-app__modal-backdrop')).toHaveClass('im-o-app__modal-backdrop--visible')
  })

  test('applies "not-ready" class when layout is not ready', () => {
    useApp.mockReturnValueOnce({
      breakpoint: 'desktop',
      interfaceType: 'map',
      preferredColorScheme: 'dark',
      layoutRefs: mockRefs,
      isLayoutReady: false,
      applicationModeEntries: [],
      isFullscreen: true
    })
    render(<Layout />)
    const overlay = document.querySelector('.im-o-app__overlay')
    expect(overlay.className).toContain('not-ready')
    const root = document.getElementById('myApp-im-app')
    expect(root.className).toContain('im-o-app--fullscreen')
  })

  test('falls back to preferredColorScheme and default background when mapStyle is missing', () => {
    useMap.mockReturnValueOnce({ mapStyle: null })
    useApp.mockReturnValueOnce({
      breakpoint: 'mobile',
      interfaceType: 'panel',
      preferredColorScheme: 'dark',
      layoutRefs: mockRefs,
      isLayoutReady: true,
      applicationModeEntries: [],
      isFullscreen: false
    })

    render(<Layout />)

    const root = document.getElementById('myApp-im-app')
    expect(root.className).toContain('im-o-app--dark-app')
    expect(root.className).not.toContain('im-o-app--light-map')
    expect(root.style.backgroundColor).toBe('')
    expect(root.className).not.toContain('im-o-app--mode-')
  })

  test('calls layout measurement and focus visible hooks', () => {
    render(<Layout />)
    expect(useLayoutMeasurements).toHaveBeenCalled()
    expect(useFocusVisible).toHaveBeenCalled()
  })
})
