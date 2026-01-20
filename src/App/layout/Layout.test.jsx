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

// Mock hooks
jest.mock('../store/configContext', () => ({ useConfig: jest.fn() }))
jest.mock('../store/appContext', () => ({ useApp: jest.fn() }))
jest.mock('../store/mapContext', () => ({ useMap: jest.fn() }))
jest.mock('../hooks/useLayoutMeasurements', () => ({ useLayoutMeasurements: jest.fn() }))
jest.mock('../hooks/useFocusVisible', () => ({ useFocusVisible: jest.fn() }))

describe('Layout', () => {
  const mockRefs = {
    appContainerRef: React.createRef(),
    mainRef: React.createRef(),
    bannerRef: React.createRef(),
    topRef: React.createRef(),
    topLeftColRef: React.createRef(),
    topRightColRef: React.createRef(),
    insetRef: React.createRef(),
    rightRef: React.createRef(),
    footerRef: React.createRef(),
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
      hasExclusiveControl: true,
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
    expect(root.className).toContain('im-o-app--dark-map')
    expect(root.className).toContain('im-o-app--exclusive-control')
    expect(root.style.backgroundColor).toBe('pink')

    const overlay = root.querySelector('.im-o-app__overlay')
    expect(overlay.className).not.toContain('not-ready')

    expect(screen.getByTestId('viewport')).toBeInTheDocument()
    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(screen.getByTestId('attributions')).toBeInTheDocument()

    expect(screen.getByTestId('slot-side')).toBeInTheDocument()
    expect(screen.getByTestId('slot-banner')).toBeInTheDocument()
    expect(screen.getByTestId('slot-top-left')).toBeInTheDocument()
    expect(screen.getByTestId('slot-footer-right')).toBeInTheDocument()
    expect(screen.getByTestId('slot-modal')).toBeInTheDocument()
  })

  test('applies "not-ready" class when layout is not ready', () => {
    useApp.mockReturnValueOnce({
      breakpoint: 'desktop',
      interfaceType: 'map',
      preferredColorScheme: 'dark',
      layoutRefs: mockRefs,
      isLayoutReady: false,
      hasExclusiveControl: false,
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
      hasExclusiveControl: false,
      isFullscreen: false
    })

    render(<Layout />)

    const root = document.getElementById('myApp-im-app')
    expect(root.className).toContain('im-o-app--dark-app')
    expect(root.className).toContain('im-o-app--light-map') // fallback
    expect(root.style.backgroundColor).toBe('')
    expect(root.className).not.toContain('exclusive-control')
  })

  test('calls layout measurement and focus visible hooks', () => {
    render(<Layout />)
    expect(useLayoutMeasurements).toHaveBeenCalled()
    expect(useFocusVisible).toHaveBeenCalled()
  })
})
