import { renderHook } from '@testing-library/react'
import { useMapProviderOverrides } from './useMapProviderOverrides'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { getSafeZoneInset } from '../../utils/getSafeZoneInset.js'
import { calculateLayout } from './useLayoutMeasurements.js'
import { scalePoints } from '../../utils/scalePoints.js'

jest.mock('../store/configContext.js')
jest.mock('../store/appContext.js')
jest.mock('../store/mapContext.js')
jest.mock('../../utils/getSafeZoneInset.js', () => ({
  ...jest.requireActual('../../utils/getSafeZoneInset.js'),
  getSafeZoneInset: jest.fn()
}))
jest.mock('./useLayoutMeasurements.js')
jest.mock('../../utils/scalePoints.js')

const setup = (overrides = {}) => {
  const dispatch = jest.fn()
  const layoutRefs = { mainRef: { current: document.createElement('div') } }
  const mapProvider = {
    fitToBounds: jest.fn(),
    setView: jest.fn(),
    setPadding: jest.fn(),
    ...overrides.mapProvider
  }
  const capturedHandlers = {}
  const eventBus = {
    on: jest.fn((event, handler) => { capturedHandlers[event] = handler }),
    off: jest.fn(),
    ...overrides.eventBus
  }

  useConfig.mockReturnValue({ mapProvider, eventBus, ...overrides.config })
  useApp.mockReturnValue({ dispatch, layoutRefs, breakpoint: 'mobile', ...overrides.app })
  useMap.mockReturnValue({ mapSize: 'md', ...overrides.map })

  getSafeZoneInset.mockReturnValue({ top: 10, right: 5, bottom: 15, left: 5 })
  scalePoints.mockReturnValue({ top: 20, right: 10, bottom: 30, left: 10 })

  return { dispatch, layoutRefs, mapProvider, eventBus, capturedHandlers }
}

describe('useMapProviderOverrides', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation(cb => cb())
  })
  afterEach(() => {
    global.requestAnimationFrame.mockRestore()
  })

  test('early returns when mapProvider is null', () => {
    setup({ config: { mapProvider: null } })
    renderHook(() => useMapProviderOverrides())
    expect(getSafeZoneInset).not.toHaveBeenCalled()
  })

  test('fitToBounds and setView store the safe zone and set it as the padding, keeping the view still', () => {
    const { mapProvider, dispatch, layoutRefs } = setup({ map: { mapSize: 'lg' } })
    renderHook(() => useMapProviderOverrides())

    const safeZone = { top: 10, right: 5, bottom: 15, left: 5 }
    const scaled = { top: 20, right: 10, bottom: 30, left: 10 }

    mapProvider.fitToBounds([0, 0, 1, 1])

    expect(calculateLayout).toHaveBeenCalledWith(layoutRefs, 'mobile')
    expect(getSafeZoneInset).toHaveBeenCalledWith(layoutRefs)
    // An unknown map size scales by 1
    expect(scalePoints).toHaveBeenCalledWith(safeZone, 1)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SAFE_ZONE_INSET',
      payload: { safeZoneInset: safeZone, syncMapPadding: false }
    })
    expect(mapProvider.setPadding).toHaveBeenCalledWith(scaled)

    jest.clearAllMocks()
    mapProvider.setView({ center: [1, 2], zoom: 15 })

    expect(getSafeZoneInset).toHaveBeenCalledWith(layoutRefs)
    expect(dispatch).toHaveBeenCalled()
    expect(mapProvider.setPadding).toHaveBeenCalledWith(scaled)
  })

  test('fitToBounds skips padding calculation when skipPaddingCalc is true', () => {
    const { mapProvider, dispatch } = setup()
    renderHook(() => useMapProviderOverrides())

    mapProvider.fitToBounds([0, 0, 1, 1], true)

    expect(getSafeZoneInset).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
    expect(mapProvider.setPadding).not.toHaveBeenCalled()
  })

  test('fitToBounds and setView early return when bounds/center is null', () => {
    const { mapProvider, dispatch } = setup()
    const originalFitBounds = mapProvider.fitToBounds
    const originalSetView = mapProvider.setView
    renderHook(() => useMapProviderOverrides())

    mapProvider.fitToBounds(null)
    mapProvider.setView({ center: null, zoom: 10 })

    expect(dispatch).not.toHaveBeenCalled()
    expect(originalFitBounds).not.toHaveBeenCalled()
    expect(originalSetView).not.toHaveBeenCalled()
  })

  test('handles missing dispatch or setPadding gracefully', () => {
    const { mapProvider } = setup({
      app: { dispatch: null },
      mapProvider: { setPadding: null, fitToBounds: jest.fn(), setView: jest.fn() }
    })
    renderHook(() => useMapProviderOverrides())

    expect(() => {
      mapProvider.fitToBounds([0, 0, 1, 1])
      mapProvider.setView({ center: [0, 0], zoom: 10 })
    }).not.toThrow()
  })

  test('restores original fitToBounds on unmount and calls originals with context', () => {
    const { mapProvider } = setup()
    const originalFitBounds = mapProvider.fitToBounds
    const originalSetView = mapProvider.setView
    const { unmount } = renderHook(() => useMapProviderOverrides())

    expect(mapProvider.fitToBounds).not.toBe(originalFitBounds)

    mapProvider.fitToBounds([0, 0, 1, 1])
    mapProvider.setView({ center: [1, 2], zoom: 15 })

    expect(originalFitBounds).toHaveBeenCalledWith([0, 0, 1, 1])
    expect(originalSetView).toHaveBeenCalledWith({ center: [1, 2], zoom: 15 })

    unmount()
    expect(mapProvider.fitToBounds).toBe(originalFitBounds)
  })

  test('reapplies overrides when dependencies change', () => {
    const { mapProvider } = setup()
    const { rerender } = renderHook(() => useMapProviderOverrides())
    const firstOverride = mapProvider.fitToBounds

    setup({ map: { mapSize: 'lg' } })
    rerender()

    expect(mapProvider.fitToBounds).not.toBe(firstOverride)
  })

  test('fitToBounds skips padding calculation when the skipPaddingCalc option is set', () => {
    const { mapProvider, dispatch } = setup()
    const originalFitBounds = mapProvider.fitToBounds
    renderHook(() => useMapProviderOverrides())

    mapProvider.fitToBounds([0, 0, 1, 1], { skipPaddingCalc: true })

    expect(getSafeZoneInset).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
    expect(originalFitBounds).toHaveBeenCalledWith([0, 0, 1, 1])
  })

  describe('preferPan and paddingPercent', () => {
    // A 1000 × 800 viewport with a 400px panel on the left: the safe zone runs from
    // (400, 0) to (1000, 800), so its centre is (700, 400)
    const safeZoneInset = { top: 0, right: 0, bottom: 0, left: 400 }

    // The viewport sits 20px from the top of the page, so panel rects are offset by it
    const viewport = { offsetWidth: 1000, offsetHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 20 }) }

    const makePanel = (rect, { hidden = false } = {}) => {
      const panel = document.createElement('div')
      panel.className = 'im-c-panel'
      panel.hidden = hidden
      panel.getBoundingClientRect = () => rect
      return panel
    }

    const makeSlot = (...children) => {
      const slot = document.createElement('div')
      children.forEach(child => slot.appendChild(child))
      return { current: slot }
    }

    const setupWithViewport = (overrides = {}) => {
      const result = setup({
        app: { layoutRefs: { viewportRef: { current: viewport }, ...overrides.slots } },
        map: { mapSize: 'small' },
        ...overrides,
        mapProvider: {
          screenToMap: jest.fn(({ x, y }) => [x, y]),
          mapToScreen: jest.fn(([x, y]) => ({ x, y })),
          ...overrides.mapProvider
        }
      })
      getSafeZoneInset.mockReturnValue(safeZoneInset)
      scalePoints.mockImplementation(jest.requireActual('../../utils/scalePoints.js').scalePoints)
      return { ...result, originalFitToBounds: result.mapProvider.fitToBounds, originalSetView: result.mapProvider.setView }
    }

    test('leaves the map alone when the bounds are already inside the safe zone', () => {
      const { mapProvider, originalFitToBounds, dispatch, originalSetView } = setupWithViewport()
      renderHook(() => useMapProviderOverrides())

      mapProvider.fitToBounds([500, 100, 600, 200], { preferPan: true })

      // The stored safe zone and the padding both stay as they were, so they still match
      expect(dispatch).not.toHaveBeenCalled()
      expect(originalSetView).not.toHaveBeenCalled()
      expect(mapProvider.setPadding).not.toHaveBeenCalled()
      expect(originalFitToBounds).not.toHaveBeenCalled()
    })

    test('pans bounds that fit to the centre of the safe zone, after setting the padding without moving the view', () => {
      const { mapProvider, originalFitToBounds, dispatch, originalSetView } = setupWithViewport()
      renderHook(() => useMapProviderOverrides())

      // Centre (150, 400), behind the panel
      mapProvider.fitToBounds([100, 300, 200, 500], { preferPan: true })

      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SAFE_ZONE_INSET', payload: { safeZoneInset, syncMapPadding: false } })
      expect(mapProvider.setPadding).toHaveBeenCalledWith(safeZoneInset)
      expect(mapProvider.setPadding.mock.invocationCallOrder[0]).toBeLessThan(originalSetView.mock.invocationCallOrder[0])
      expect(originalSetView).toHaveBeenCalledWith({ center: [150, 400] })
      expect(originalFitToBounds).not.toHaveBeenCalled()
    })

    test('pans in map pixels at larger map sizes', () => {
      const { mapProvider, originalSetView } = setupWithViewport({ map: { mapSize: 'large' } })
      renderHook(() => useMapProviderOverrides())

      // Map pixels (50, 200) are CSS pixels (100, 400), 600 left of the safe zone centre
      mapProvider.fitToBounds([50, 200, 50, 200], { preferPan: true })

      expect(originalSetView).toHaveBeenCalledWith({ center: [50, 200] })
    })

    test('pans bounds inside the safe zone but under a panel too small to narrow it', () => {
      // A 300 × 100 panel at the top right, which the safe zone leaves out
      const smallPanel = makePanel({ left: 700, top: 20, right: 1000, bottom: 120, width: 300, height: 100 })
      const { mapProvider, originalSetView } = setupWithViewport({ slots: { rightTopRef: makeSlot(smallPanel) } })
      renderHook(() => useMapProviderOverrides())

      mapProvider.fitToBounds([800, 50, 800, 50], { preferPan: true })

      expect(originalSetView).toHaveBeenCalledWith({ center: [800, 50] })
    })

    test('checks every open panel in a slot, skipping closed ones', () => {
      const closedPanel = makePanel({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }, { hidden: true })
      const openPanel = makePanel({ left: 700, top: 20, right: 1000, bottom: 120, width: 300, height: 100 })
      const { mapProvider, originalSetView } = setupWithViewport({ slots: { rightTopRef: makeSlot(closedPanel, openPanel) } })
      renderHook(() => useMapProviderOverrides())

      mapProvider.fitToBounds([800, 50, 800, 50], { preferPan: true })

      expect(originalSetView).toHaveBeenCalled()
    })

    test('ignores elements in a slot that aren\'t panels', () => {
      const buttons = document.createElement('div')
      buttons.getBoundingClientRect = () => ({ left: 700, top: 20, right: 1000, bottom: 120, width: 300, height: 100 })
      const { mapProvider, originalSetView } = setupWithViewport({ slots: { rightTopRef: makeSlot(buttons) } })
      renderHook(() => useMapProviderOverrides())

      mapProvider.fitToBounds([800, 50, 800, 50], { preferPan: true })

      expect(originalSetView).not.toHaveBeenCalled()
    })

    test('fits bounds too big for the safe zone, setting the padding first', () => {
      const { mapProvider, originalFitToBounds, originalSetView } = setupWithViewport()
      renderHook(() => useMapProviderOverrides())

      mapProvider.fitToBounds([0, 0, 900, 100], { preferPan: true })

      expect(originalSetView).not.toHaveBeenCalled()
      expect(mapProvider.setPadding).toHaveBeenCalledWith(safeZoneInset)
      expect(originalFitToBounds).toHaveBeenCalledWith([0, 0, 900, 100])
    })

    test('passes paddingPercent to the fit as extra padding, worked out from the safe zone', () => {
      const { mapProvider, originalFitToBounds } = setupWithViewport()
      renderHook(() => useMapProviderOverrides())

      mapProvider.fitToBounds([0, 0, 900, 100], { paddingPercent: 10 })

      expect(originalFitToBounds).toHaveBeenCalledWith([0, 0, 900, 100], { padding: { top: 80, right: 60, bottom: 80, left: 60 } })
    })

    test('passes the extra padding in map pixels at larger map sizes', () => {
      const { mapProvider, originalFitToBounds } = setupWithViewport({ map: { mapSize: 'large' } })
      renderHook(() => useMapProviderOverrides())

      mapProvider.fitToBounds([0, 0, 900, 100], { paddingPercent: 10 })

      expect(originalFitToBounds).toHaveBeenCalledWith([0, 0, 900, 100], { padding: { top: 40, right: 30, bottom: 40, left: 30 } })
    })

    test('passes no extra padding when paddingPercent is 0', () => {
      const { mapProvider, originalFitToBounds } = setupWithViewport()
      renderHook(() => useMapProviderOverrides())

      mapProvider.fitToBounds([0, 0, 900, 100], { preferPan: true, paddingPercent: 0 })

      expect(originalFitToBounds).toHaveBeenCalledWith([0, 0, 900, 100])
    })

    test('fits as before when the safe zone can\'t be measured', () => {
      const { mapProvider, originalFitToBounds, originalSetView } = setupWithViewport()
      renderHook(() => useMapProviderOverrides())
      getSafeZoneInset.mockReturnValue(undefined)

      mapProvider.fitToBounds([500, 100, 600, 200], { preferPan: true })

      expect(originalSetView).not.toHaveBeenCalled()
      expect(mapProvider.setPadding).not.toHaveBeenCalled()
      expect(originalFitToBounds).toHaveBeenCalledWith([500, 100, 600, 200])
    })

    test('MAP_FIT_TO_BOUNDS event forwards the options', () => {
      const { capturedHandlers, originalSetView } = setupWithViewport()
      renderHook(() => useMapProviderOverrides())

      capturedHandlers['map:fittobounds']([100, 300, 200, 500], { preferPan: true })

      expect(originalSetView).toHaveBeenCalledWith({ center: [150, 400] })
    })
  })

  test('subscribes to MAP_FIT_TO_BOUNDS and MAP_SET_VIEW on eventBus', () => {
    const { eventBus } = setup()
    renderHook(() => useMapProviderOverrides())

    expect(eventBus.on).toHaveBeenCalledWith('map:fittobounds', expect.any(Function))
    expect(eventBus.on).toHaveBeenCalledWith('map:setview', expect.any(Function))
  })

  test('MAP_FIT_TO_BOUNDS event forwards bbox to mapProvider.fitToBounds', () => {
    const { mapProvider, capturedHandlers } = setup()
    const originalFitToBounds = mapProvider.fitToBounds
    renderHook(() => useMapProviderOverrides())

    capturedHandlers['map:fittobounds']([0, 0, 1, 1])

    expect(originalFitToBounds).toHaveBeenCalledWith([0, 0, 1, 1])
  })

  test('MAP_SET_VIEW event forwards opts to mapProvider.setView', () => {
    const { mapProvider, capturedHandlers } = setup()
    const originalSetView = mapProvider.setView
    renderHook(() => useMapProviderOverrides())

    capturedHandlers['map:setview']({ center: [1, 2], zoom: 10 })

    expect(originalSetView).toHaveBeenCalledWith({ center: [1, 2], zoom: 10 })
  })

  test('MAP_RESET_VIEW event moves the map to the configured view', () => {
    const { mapProvider, capturedHandlers } = setup({ config: { center: [1, 2], zoom: 10 } })
    const originalSetView = mapProvider.setView
    renderHook(() => useMapProviderOverrides())

    capturedHandlers['map:resetview']()

    expect(originalSetView).toHaveBeenCalledWith({ center: [1, 2], zoom: 10 })
  })

  test('unsubscribes from MAP_FIT_TO_BOUNDS and MAP_SET_VIEW on unmount', () => {
    const { eventBus } = setup()
    const { unmount } = renderHook(() => useMapProviderOverrides())

    unmount()

    expect(eventBus.off).toHaveBeenCalledWith('map:fittobounds', expect.any(Function))
    expect(eventBus.off).toHaveBeenCalledWith('map:setview', expect.any(Function))
    expect(eventBus.off).toHaveBeenCalledWith('map:resetview', expect.any(Function))
  })

  test('skips event subscriptions when eventBus is null', () => {
    setup({ config: { eventBus: null } })
    expect(() => renderHook(() => useMapProviderOverrides())).not.toThrow()
  })
})
