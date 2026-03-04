import { renderHook } from '@testing-library/react'
import { useVisibleGeometry, getGeometryType, getPointCoordinates } from './useVisibleGeometry'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'

jest.mock('../store/configContext.js')
jest.mock('../store/appContext.js')

const pointFeature = { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 51] }, properties: {} }
const multiPointFeature = { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[1, 51], [2, 52]] }, properties: {} }
const polygonFeature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, properties: {} }

const insetPanelRect = { left: 600, top: 0, right: 1000, bottom: 800, width: 400, height: 800 }
const bottomPanelRect = { left: 0, top: 500, right: 1000, bottom: 800, width: 1000, height: 300 }

const setup = (overrides = {}) => {
  const capturedHandlers = {}
  const mapProvider = {
    isGeometryObscured: jest.fn(() => true),
    fitToBounds: jest.fn(),
    setView: jest.fn(),
    ...overrides.mapProvider
  }
  const eventBus = {
    on: jest.fn((event, handler) => { capturedHandlers[event] = handler }),
    off: jest.fn(),
    ...overrides.eventBus
  }

  const insetEl = document.createElement('div')
  insetEl.getBoundingClientRect = jest.fn(() => insetPanelRect)
  const bottomEl = document.createElement('div')
  bottomEl.getBoundingClientRect = jest.fn(() => bottomPanelRect)

  const layoutRefs = {
    mainRef: { current: document.createElement('div') },
    insetRef: { current: insetEl },
    bottomRef: { current: bottomEl },
    ...overrides.layoutRefs
  }
  const panelConfig = {
    myPanel: { visibleGeometry: polygonFeature, desktop: { slot: 'inset' } },
    emptyPanel: {},
    ...overrides.panelConfig
  }
  const panelRegistry = {
    getPanelConfig: jest.fn(() => panelConfig),
    ...overrides.panelRegistry
  }

  useConfig.mockReturnValue({ mapProvider, eventBus, ...overrides.config })
  useApp.mockReturnValue({ layoutRefs, panelConfig, panelRegistry, breakpoint: 'desktop', ...overrides.app })

  return { mapProvider, eventBus, capturedHandlers, layoutRefs, panelConfig, insetEl, bottomEl }
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
    expect(mapProvider.isGeometryObscured).not.toHaveBeenCalled()
  })

  test('does nothing when panel does not exist in config', () => {
    const { mapProvider, capturedHandlers } = setup()
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'unknownPanel' })
    expect(mapProvider.isGeometryObscured).not.toHaveBeenCalled()
  })

  test('does nothing when panel has visibleGeometry but no slot config', () => {
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { noSlotPanel: { visibleGeometry: polygonFeature } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'noSlotPanel' })
    expect(mapProvider.isGeometryObscured).not.toHaveBeenCalled()
  })

  test('does nothing when mapProvider has no isGeometryObscured method', () => {
    const { capturedHandlers, mapProvider } = setup({ mapProvider: { isGeometryObscured: null, fitToBounds: jest.fn(), setView: jest.fn() } })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('does nothing when slot ref has zero dimensions (panel not visible)', () => {
    const zeroEl = document.createElement('div')
    zeroEl.getBoundingClientRect = jest.fn(() => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }))
    const { mapProvider, capturedHandlers } = setup({
      layoutRefs: {
        mainRef: { current: document.createElement('div') },
        insetRef: { current: zeroEl }
      }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })

    // Run the current pending animation frame
    jest.runOnlyPendingTimers()

    expect(mapProvider.isGeometryObscured).not.toHaveBeenCalled()
  })

  test('does nothing when geometry is not obscured', () => {
    const { mapProvider, capturedHandlers } = setup({ mapProvider: { isGeometryObscured: jest.fn(() => false), fitToBounds: jest.fn(), setView: jest.fn() } })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
    expect(mapProvider.setView).not.toHaveBeenCalled()
  })

  test('calls fitToBounds with visibleGeometry for non-point geometry when obscured', () => {
    const { mapProvider, capturedHandlers } = setup()
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()

    expect(mapProvider.isGeometryObscured).toHaveBeenCalledWith(polygonFeature, insetPanelRect)
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature)
    expect(mapProvider.setView).not.toHaveBeenCalled()
  })

  test('calls setView with center for Point geometry when obscured', () => {
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { pointPanel: { visibleGeometry: pointFeature, desktop: { slot: 'inset' } } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'pointPanel' })
    jest.runAllTimers()

    expect(mapProvider.setView).toHaveBeenCalledWith({ center: [1, 51] })
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('calls setView with first coordinate for MultiPoint geometry when obscured', () => {
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { mpPanel: { visibleGeometry: multiPointFeature, desktop: { slot: 'inset' } } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'mpPanel' })
    jest.runAllTimers()

    expect(mapProvider.setView).toHaveBeenCalledWith({ center: [1, 51] })
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('calls fitToBounds for a raw non-Feature geometry (e.g. Polygon) when obscured', () => {
    const rawPolygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { geoPanel: { visibleGeometry: rawPolygon, desktop: { slot: 'inset' } } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'geoPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(rawPolygon)
    expect(mapProvider.setView).not.toHaveBeenCalled()
  })

  test('calls setView for a raw Point geometry (not Feature-wrapped) when obscured', () => {
    const rawPoint = { type: 'Point', coordinates: [1, 51] }
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { rawPointPanel: { visibleGeometry: rawPoint, desktop: { slot: 'inset' } } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'rawPointPanel' })
    jest.runAllTimers()
    expect(mapProvider.setView).toHaveBeenCalledWith({ center: [1, 51] })
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('does not call setView when Point feature has null coordinates', () => {
    const nullCoordsFeature = { type: 'Feature', geometry: { type: 'Point', coordinates: null }, properties: {} }
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { nullPanel: { visibleGeometry: nullCoordsFeature, desktop: { slot: 'inset' } } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'nullPanel' })
    jest.runAllTimers()
    expect(mapProvider.setView).not.toHaveBeenCalled()
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  test('uses bottom slot ref when panel is in bottom slot', () => {
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: { bottomPanel: { visibleGeometry: polygonFeature, desktop: { slot: 'bottom' } } }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'bottomPanel' })
    jest.runAllTimers()

    expect(mapProvider.isGeometryObscured).toHaveBeenCalledWith(polygonFeature, bottomPanelRect)
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature)
  })

  test('uses latest panelConfig via ref when it changes between renders', () => {
    const { mapProvider, capturedHandlers, insetEl } = setup()
    const { rerender } = renderHook(() => useVisibleGeometry())

    const updatedGeometry = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: {} }
    const updatedPanelConfig = { myPanel: { visibleGeometry: updatedGeometry, desktop: { slot: 'inset' } } }
    useApp.mockReturnValue({
      layoutRefs: { mainRef: { current: document.createElement('div') }, insetRef: { current: insetEl } },
      panelConfig: updatedPanelConfig,
      panelRegistry: { getPanelConfig: jest.fn(() => updatedPanelConfig) },
      breakpoint: 'desktop'
    })
    rerender()

    capturedHandlers['app:panelopened']({ panelId: 'myPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(updatedGeometry)
  })

  test('uses slot from event payload when registry config lacks slot info', () => {
    const freshGeometry = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, properties: {} }
    const { mapProvider, capturedHandlers } = setup({
      panelRegistry: { getPanelConfig: jest.fn(() => ({ freshPanel: { visibleGeometry: freshGeometry } })) }
    })
    renderHook(() => useVisibleGeometry())
    // Event includes slot (as middleware provides for ADD_PANEL); registry config has no slot info
    capturedHandlers['app:panelopened']({ panelId: 'freshPanel', slot: 'inset' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(freshGeometry)
  })

  test('falls back to panelRegistry for panels not yet in stale panelConfig', () => {
    const freshGeometry = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, properties: {} }
    const { mapProvider, capturedHandlers } = setup({
      panelRegistry: { getPanelConfig: jest.fn(() => ({ freshPanel: { visibleGeometry: freshGeometry, desktop: { slot: 'inset' } } })) }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'freshPanel' })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(freshGeometry)
  })

  test('falls back to config when panel not in panelConfig and registry returns null', () => {
    const { mapProvider, capturedHandlers } = setup({
      panelConfig: {}, // panel not present
      panelRegistry: { getPanelConfig: jest.fn(() => null) } // registry returns null
    })

    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'missingPanel', visibleGeometry: polygonFeature, slot: 'inset' })
    jest.runAllTimers()
    // Should still call fitToBounds using visibleGeometry from event payload
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature)
  })

  test('uses visibleGeometry from event payload directly, bypassing registry (ADD_PANEL first-click case)', () => {
    // Registry is empty — simulates first ADD_PANEL before React has processed the reducer
    const { mapProvider, capturedHandlers } = setup({
      panelRegistry: { getPanelConfig: jest.fn(() => ({})) }
    })
    renderHook(() => useVisibleGeometry())
    capturedHandlers['app:panelopened']({ panelId: 'newPanel', slot: 'inset', visibleGeometry: polygonFeature })
    jest.runAllTimers()
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith(polygonFeature)
  })
})

describe('getGeometryType', () => {
  test('returns null for falsy input', () => {
    expect(getGeometryType(null)).toBeNull()
    expect(getGeometryType(undefined)).toBeNull()
  })

  test('returns geometry type for a Feature', () => {
    expect(getGeometryType({ type: 'Feature', geometry: { type: 'Polygon' } })).toBe('Polygon')
  })

  test('returns type directly for a raw geometry', () => {
    expect(getGeometryType({ type: 'Point' })).toBe('Point')
    expect(getGeometryType({ type: 'FeatureCollection' })).toBe('FeatureCollection')
  })
})

describe('getPointCoordinates', () => {
  test('returns null for unrecognised geometry type', () => {
    expect(getPointCoordinates({ type: 'Polygon', coordinates: [] })).toBeNull()
    expect(getPointCoordinates({ type: 'LineString', coordinates: [] })).toBeNull()
  })

  test('returns coordinates for a Point', () => {
    expect(getPointCoordinates(pointFeature.geometry)).toEqual(pointFeature.geometry.coordinates)
  })

  test('returns first coordinate for a MultiPoint', () => {
    expect(getPointCoordinates(multiPointFeature.geometry)).toEqual(multiPointFeature.geometry.coordinates[0])
  })

  test('recurses into Feature geometry', () => {
    expect(getPointCoordinates(pointFeature)).toEqual(pointFeature.geometry.coordinates)
  })
})
