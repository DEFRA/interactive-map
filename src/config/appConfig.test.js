import { render } from '@testing-library/react'
import { defaultAppConfig, defaultButtonConfig, scaleFactor, markerSvgPaths } from './appConfig'

describe('defaultAppConfig', () => {
  const appState = {
    layoutRefs: { appContainerRef: { current: document.createElement('div') } },
    isFullscreen: false,
    interfaceType: 'mouse'
  }

  const buttons = defaultAppConfig.buttons
  const fullscreenBtn = buttons.find(b => b.id === 'fullscreen')
  const exitBtn = buttons.find(b => b.id === 'exit')
  const zoomInBtn = buttons.find(b => b.id === 'zoomIn')
  const zoomOutBtn = buttons.find(b => b.id === 'zoomOut')

  // --- UI RENDER TESTS ---
  it('renders KeyboardHelp panel', () => {
    const panel = defaultAppConfig.panels.find(p => p.id === 'keyboardHelp')
    const { container } = render(panel.render())
    expect(container.querySelector('.im-c-keyboard-help')).toBeInTheDocument()
  })

  // --- EXIT BUTTON (Line 27 Coverage) ---
  it('covers all branches of exitBtn excludeWhen', () => {
    const config = { hasExitButton: true, mapViewParamKey: 'view' }

    expect(exitBtn.excludeWhen({
      appConfig: { ...config, hasExitButton: false },
      appState: { isFullscreen: true }
    })).toBe(true)

    window.history.pushState({}, '', '?view=map')
    expect(exitBtn.excludeWhen({
      appConfig: config,
      appState: { isFullscreen: false }
    })).toBe(true)

    window.history.pushState({}, '', '?wrong=param')
    expect(exitBtn.excludeWhen({
      appConfig: config,
      appState: { isFullscreen: true }
    })).toBe(true)

    window.history.pushState({}, '', '?view=map')
    expect(exitBtn.excludeWhen({
      appConfig: config,
      appState: { isFullscreen: true }
    })).toBe(false)
  })

  it('calls exit button onClick correctly', () => {
    const servicesMock = { closeApp: jest.fn() }
    exitBtn.onClick({}, { services: servicesMock })
    expect(servicesMock.closeApp).toHaveBeenCalled()
  })

  // --- FULLSCREEN BUTTON (Line 39 Coverage) ---
  it('evaluates fullscreen label and icon states', () => {
    const containerMock = { requestFullscreen: jest.fn() }
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true })

    expect(fullscreenBtn.label({ appState })).toBe('Enter fullscreen')
    expect(fullscreenBtn.iconId({ appState })).toBe('maximise')

    Object.defineProperty(document, 'fullscreenElement', { value: containerMock, writable: true, configurable: true })
    expect(fullscreenBtn.label({ appState })).toBe('Exit fullscreen')
    expect(fullscreenBtn.iconId({ appState })).toBe('minimise')
  })

  it('covers all branches of fullscreen excludeWhen', () => {
    expect(fullscreenBtn.excludeWhen({ appConfig: { enableFullscreen: false }, appState: { isFullscreen: false } })).toBe(true)
    expect(fullscreenBtn.excludeWhen({ appConfig: { enableFullscreen: true }, appState: { isFullscreen: true } })).toBe(true)
    expect(fullscreenBtn.excludeWhen({ appConfig: { enableFullscreen: true }, appState: { isFullscreen: false } })).toBe(false)
  })

  it('calls fullscreen onClick correctly', () => {
    const containerMock = { requestFullscreen: jest.fn() }
    const appStateMock = { layoutRefs: { appContainerRef: { current: containerMock } } }
    document.exitFullscreen = jest.fn()

    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true })
    fullscreenBtn.onClick({}, { appState: appStateMock })
    expect(containerMock.requestFullscreen).toHaveBeenCalled()

    Object.defineProperty(document, 'fullscreenElement', { value: containerMock, writable: true, configurable: true })
    fullscreenBtn.onClick({}, { appState: appStateMock })
    expect(document.exitFullscreen).toHaveBeenCalled()
  })

  // --- ZOOM BUTTONS (Line 60 & 70 Coverage) ---
  it('covers all branches of zoom excludeWhen for BOTH buttons', () => {
    // We run this test for both ZoomIn and ZoomOut to ensure
    // identical lines in both button configs are covered.
    [zoomInBtn, zoomOutBtn].forEach((btn) => {
      // Branch A: First part of OR is true (!enableZoomControls)
      expect(btn.excludeWhen({
        appConfig: { enableZoomControls: false },
        appState: { interfaceType: 'mouse' }
      })).toBe(true)

      // Branch B: Second part of OR is true (interfaceType === 'touch')
      expect(btn.excludeWhen({
        appConfig: { enableZoomControls: true },
        appState: { interfaceType: 'touch' }
      })).toBe(true)

      // Branch C: Both parts are false (Result: false)
      expect(btn.excludeWhen({
        appConfig: { enableZoomControls: true },
        appState: { interfaceType: 'mouse' }
      })).toBe(false)
    })
  })

  it('evaluates zoom enableWhen logic', () => {
    expect(zoomInBtn.enableWhen({ mapState: { isAtMaxZoom: true } })).toBe(false)
    expect(zoomInBtn.enableWhen({ mapState: { isAtMaxZoom: false } })).toBe(true)
    expect(zoomOutBtn.enableWhen({ mapState: { isAtMinZoom: true } })).toBe(false)
    expect(zoomOutBtn.enableWhen({ mapState: { isAtMinZoom: false } })).toBe(true)
  })

  it('triggers mapProvider zoom methods on click', () => {
    const mapProviderMock = { zoomIn: jest.fn(), zoomOut: jest.fn() }
    const appConfigMock = { zoomDelta: 2 }

    zoomInBtn.onClick({}, { mapProvider: mapProviderMock, appConfig: appConfigMock })
    expect(mapProviderMock.zoomIn).toHaveBeenCalledWith(2)

    zoomOutBtn.onClick({}, { mapProvider: mapProviderMock, appConfig: appConfigMock })
    expect(mapProviderMock.zoomOut).toHaveBeenCalledWith(2)
  })

  // --- SUPPLEMENTARY CONFIGS ---
  it('exports supplementary configs and constants', () => {
    expect(defaultButtonConfig.label).toBe('Button')
    expect(scaleFactor.large).toBe(2)
    expect(markerSvgPaths[0].shape).toBe('pin')
  })
})
