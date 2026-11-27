import { renderHook } from '@testing-library/react'
import { useVisibleGeometry } from './useVisibleGeometry'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { getPanelElementId } from '../../utils/getPanelElementId.js'

jest.mock('../store/configContext.js')
jest.mock('../store/appContext.js')
jest.mock('../store/mapContext.js')
// Like the real one: a value is returned as it is, a function is called with the context
jest.mock('./useEvaluateProp.js', () => ({
  useEvaluateProp: () => (prop, pluginId) => typeof prop === 'function' ? prop({ pluginId, pluginState: { feature: 'from plugin state' } }) : prop
}))

const pointFeature = { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 51] }, properties: {} }
const polygonFeature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, properties: {} }

const APP_ID = 'test'
const panelRect = { left: 600, top: 0, right: 1000, bottom: 800, width: 400, height: 800 }

// Every coordinate lands at (700, 100), under the panel
const underPanel = () => ({ x: 700, y: 100 })

// Creates a panel DOM element with id matching what useVisibleGeometry queries.
const makePanelEl = (panelId, rect = panelRect) => {
  const el = document.createElement('div')
  el.id = getPanelElementId(APP_ID, panelId)
  el.getBoundingClientRect = jest.fn(() => rect)
  return el
}

const setup = (overrides = {}) => {
  const capturedHandlers = {}
  const mapProvider = {
    fitToBounds: jest.fn(),
    mapToScreen: jest.fn(underPanel),
    ...overrides.mapProvider
  }
  const eventBus = {
    on: jest.fn((event, handler) => { capturedHandlers[event] = handler }),
    off: jest.fn(),
    ...overrides.eventBus
  }

  // appContainerRef holds panel elements that the hook queries by id, in a slot over the map
  const appContainer = document.createElement('div')
  const myPanelEl = makePanelEl('myPanel')
  appContainer.appendChild(myPanelEl)

  const viewport = document.createElement('div')
  viewport.getBoundingClientRect = () => ({ left: 0, top: 0 })

  const layoutRefs = {
    mainRef: { current: document.createElement('div') },
    appContainerRef: { current: appContainer },
    viewportRef: { current: viewport },
    // Tests that pass their own container keep it in the slot
    rightTopRef: overrides.layoutRefs?.appContainerRef ?? { current: appContainer },
    ...overrides.layoutRefs
  }
  const panelConfig = {
    myPanel: { visibleGeometry: polygonFeature, desktop: { slot: 'left-top' } },
    emptyPanel: {},
    ...overrides.panelConfig
  }
  const panelRegistry = {
    getPanelConfig: jest.fn(() => panelConfig),
    ...overrides.panelRegistry
  }

  useConfig.mockReturnValue({ id: APP_ID, mapProvider, eventBus, ...overrides.config })
  useApp.mockReturnValue({ layoutRefs, panelConfig, panelRegistry, breakpoint: 'desktop', ...overrides.app })
  useMap.mockReturnValue({ mapSize: 'small', ...overrides.map })

  return { mapProvider, eventBus, capturedHandlers, layoutRefs, panelConfig, myPanelEl, appContainer }
}

describe('useVisibleGeometry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  test('early returns when mapProvider is null', () => {
    setup({ config: { mapProvider: null } })
    const { result } = renderHook(() => useVisibleGeometry())
    expect(result.error).toBeUndefined()
  })

  test('early returns when eventBus is null', () => {
    setup({ config: { eventBus: null } })
    const { result } = renderHook(() => useVisibleGeometry())
    expect(result.error).toBeUndefined()
  })

  test('subscribes to APP_PANEL_OPENED on eventBus', () => {
    const { eventBus } = setup()
    renderHook(() => useVisibleGeometry())
    expect(eventBus.on).toHaveBeenCalledWith('app:panelopened', expect.any(Function))
  })

  test('unsubscribes from APP_PANEL_OPENED on unmount', () => {
    const { eventBus } = setup()
    const { unmount } = renderHook(() => useVisibleGeometry())
    unmount()
    expect(eventBus.off).toHaveBeenCalledWith('app:panelopened', expect.any(Function))
  })

  test('does nothing when panel has no visibleGeometry', () => {
    const { mapProvider, capturedHandlers } = setup()
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'emptyPanel' })
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('does nothing when panel does not exist in config', () => {
    const { mapProvider, capturedHandlers } = setup()
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'unknownPanel' })
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('does nothing when panel element is not in the DOM', () => {
    // Panel has visibleGeometry and slot config but its DOM element is not mounted yet
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { noElPanel: { visibleGeometry: polygonFeature, desktop: { slot: 'left-top' } } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'noElPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('calls fitToBounds with preferPan once the panel has a size', () => {
    const { mapProvider, capturedHandlers } = setup()
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()

    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature, { preferPan: true })
  })

  test('waits for the panel to have a size before calling fitToBounds', () => {
    const zeroRect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }
    const panelEl = makePanelEl('myPanel', zeroRect)
    const appContainer = document.createElement('div')
    appContainer.appendChild(panelEl)
    const { mapProvider, capturedHandlers } = setup({
      layoutRefs: { mainRef: { current: document.createElement('div') }, appContainerRef: { current: appContainer } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runOnlyPendingTimers()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()

    panelEl.getBoundingClientRect.mockReturnValue(panelRect)
    jest.runOnlyPendingTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature, { preferPan: true })
  })

  test('passes a bare geometry, not just a Feature, to fitToBounds', () => {
    const rawPolygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
    const appContainer = document.createElement('div')
    appContainer.appendChild(makePanelEl('geoPanel'))
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { geoPanel: { visibleGeometry: rawPolygon, desktop: { slot: 'left-top' } } },
      layoutRefs: { mainRef: { current: document.createElement('div') }, appContainerRef: { current: appContainer } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'geoPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(rawPolygon, { preferPan: true })
  })

  test('leaves the map alone when the geometry isn\'t under the panel', () => {
    const { mapProvider, capturedHandlers } = setup({ mapProvider: { mapToScreen: jest.fn(() => ({ x: 100, y: 100 })) } })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('leaves the map alone when the geometry is off screen', () => {
    const { mapProvider, capturedHandlers } = setup({ mapProvider: { mapToScreen: jest.fn(() => ({ x: -500, y: 100 })) } })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('moves the map when only part of the geometry is under the panel', () => {
    // West corners at x 500, east corners at x 650, across the panel's left edge at 600
    const mapToScreen = jest.fn(([x]) => ({ x: x === 0 ? 500 : 650, y: 100 }))
    const { mapProvider, capturedHandlers } = setup({ mapProvider: { mapToScreen } })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature, { preferPan: true })
  })

  test('measures the geometry in CSS pixels at larger map sizes', () => {
    // Map pixel 350 is CSS pixel 700 at the large size, under the panel
    const { mapProvider, capturedHandlers } = setup({
      mapProvider: { mapToScreen: jest.fn(() => ({ x: 350, y: 50 })) },
      map: { mapSize: 'large' }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalled()
  })

  test('measures the panel relative to the viewport', () => {
    // The geometry at x 700 is under a panel at 600–1000 on the page, but the viewport starts
    // at 300, so the panel covers 300–700 of the map and only touches the geometry's edge
    const { mapProvider, capturedHandlers, layoutRefs } = setup()
    layoutRefs.viewportRef.current.getBoundingClientRect = () => ({ left: 300, top: 0 })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('leaves the map alone for a panel that isn\'t in a slot over the map, like a modal', () => {
    const { mapProvider, capturedHandlers } = setup({ layoutRefs: { rightTopRef: { current: document.createElement('div') } } })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('moves the map for a panel in the drawer', () => {
    const drawer = document.createElement('div')
    drawer.appendChild(makePanelEl('myPanel'))
    const { mapProvider, capturedHandlers } = setup({
      layoutRefs: { appContainerRef: { current: drawer }, rightTopRef: { current: null }, drawerRef: { current: drawer } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalled()
  })

  test('leaves the map alone when there is no viewport to measure against', () => {
    const { mapProvider, capturedHandlers } = setup({ layoutRefs: { viewportRef: { current: null } } })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('finds a panel whose id is in camelCase', () => {
    // The panel's element id is in kebab case: test-panel-draw-rules-issues
    const appContainer = document.createElement('div')
    appContainer.appendChild(makePanelEl('drawRulesIssues'))
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { drawRulesIssues: { visibleGeometry: polygonFeature } },
      layoutRefs: { appContainerRef: { current: appContainer } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'drawRulesIssues' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature, { preferPan: true })
  })

  test('calls a visibleGeometry function as the panel opens, with its plugin\'s context', () => {
    const visibleGeometry = jest.fn(({ pluginState }) => pluginState.feature === 'from plugin state' ? pointFeature : null)
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { myPanel: { visibleGeometry, pluginId: 'drawRules' } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(visibleGeometry).toHaveBeenCalledWith(expect.objectContaining({ pluginId: 'drawRules' }))
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(pointFeature, { preferPan: true })
  })

  test('leaves the map alone when a visibleGeometry function returns nothing', () => {
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { myPanel: { visibleGeometry: () => null } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('passes the panel\'s own preferPan and paddingPercent to fitToBounds', () => {
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { myPanel: { visibleGeometry: polygonFeature, preferPan: false, paddingPercent: 10 } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature, { preferPan: false, paddingPercent: 10 })
  })

  test('uses the options sent with the opened event, for a panel opening as it\'s added', () => {
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { myPanel: { visibleGeometry: polygonFeature, preferPan: false, paddingPercent: 10 } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel', visibleGeometry: pointFeature, preferPan: true, paddingPercent: 20 })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(pointFeature, { preferPan: true, paddingPercent: 20 })
  })

  test('uses the panel\'s own value for each option the opened event leaves out', () => {
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { myPanel: { visibleGeometry: polygonFeature, preferPan: false, paddingPercent: 10 } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel', visibleGeometry: pointFeature })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(pointFeature, { preferPan: false, paddingPercent: 10 })
  })

  test('uses latest panelConfig via ref when it changes between renders', () => {
    const { mapProvider, capturedHandlers, appContainer } = setup()
    const { rerender } = renderHook(() => useVisibleGeometry())

    const updatedGeometry = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: {} }
    const updatedPanelConfig = { myPanel: { visibleGeometry: updatedGeometry, desktop: { slot: 'left-top' } } }
    useApp.mockReturnValue({
      layoutRefs: { mainRef: { current: document.createElement('div') }, appContainerRef: { current: appContainer } },
      panelConfig: updatedPanelConfig,
      panelRegistry: { getPanelConfig: jest.fn(() => updatedPanelConfig) },
      breakpoint: 'desktop'
    })
    rerender()

    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(updatedGeometry, { preferPan: true })
  })

  test('falls back to panelRegistry for panels not yet in stale panelConfig', () => {
    const freshGeometry = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, properties: {} }
    const appContainer = document.createElement('div')
    appContainer.appendChild(makePanelEl('freshPanel'))
    const { mapProvider, capturedHandlers } = setup({
      panelRegistry: { getPanelConfig: jest.fn(() => ({ freshPanel: { visibleGeometry: freshGeometry, desktop: { slot: 'left-top' } } })) },
      layoutRefs: { mainRef: { current: document.createElement('div') }, appContainerRef: { current: appContainer } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'freshPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(freshGeometry, { preferPan: true })
  })

  test('falls back to config when panel not in panelConfig and registry returns null', () => {
    const appContainer = document.createElement('div')
    appContainer.appendChild(makePanelEl('missingPanel'))
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: {}, // panel not present
      panelRegistry: { getPanelConfig: jest.fn(() => null) }, // registry returns null
      layoutRefs: { mainRef: { current: document.createElement('div') }, appContainerRef: { current: appContainer } }
    })

    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'missingPanel', visibleGeometry: polygonFeature, slot: 'left-top' })
    jest.runAllTimers()
    // Should still call fitToBounds using visibleGeometry from event payload
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature, { preferPan: true })
  })

  test('uses visibleGeometry from event payload directly, bypassing registry (ADD_PANEL first-click case)', () => {
    // Registry is empty — simulates first ADD_PANEL before React has processed the reducer
    const appContainer = document.createElement('div')
    appContainer.appendChild(makePanelEl('newPanel'))
    const { mapProvider, capturedHandlers } = setup({
      panelRegistry: { getPanelConfig: jest.fn(() => ({})) },
      layoutRefs: { mainRef: { current: document.createElement('div') }, appContainerRef: { current: appContainer } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'newPanel', slot: 'left-top', visibleGeometry: polygonFeature })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature, { preferPan: true })
  })
})
