import React from 'react'
import { render } from '@testing-library/react'
import { MapController } from './MapController'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'
import { useMap } from '../../store/mapContext'
import { useMapStateSync } from '../../hooks/useMapStateSync'
import { useUserMoveTracking } from '../../hooks/useUserMoveTracking'
import { useMapURLSync } from '../../hooks/useMapURLSync'
import { useMapAnnouncements } from '../../hooks/useMapAnnouncements'
import { useMapProviderOverrides } from '../../hooks/useMapProviderOverrides'
import { scaleFactor } from '../../../config/appConfig'
import { scalePoints } from '../../../utils/scalePoints'

jest.mock('../../store/configContext', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/appContext', () => ({ useApp: jest.fn() }))
jest.mock('../../store/mapContext', () => ({ useMap: jest.fn() }))
jest.mock('../../hooks/useMapStateSync', () => ({ useMapStateSync: jest.fn() }))
jest.mock('../../hooks/useUserMoveTracking', () => ({ useUserMoveTracking: jest.fn() }))
jest.mock('../../hooks/useMapURLSync', () => ({ useMapURLSync: jest.fn() }))
jest.mock('../../hooks/useMapAnnouncements', () => ({ useMapAnnouncements: jest.fn() }))
jest.mock('../../hooks/useMapProviderOverrides', () => ({ useMapProviderOverrides: jest.fn() }))
jest.mock('../../../utils/mapStateSync', () => ({
  getInitialMapState: jest.fn(() => ({ center: [0, 0], zoom: 5, bounds: [0, 0, 10, 10] }))
}))
jest.mock('../../../utils/scalePoints', () => ({ scalePoints: jest.fn(obj => obj) }))

describe('MapController', () => {
  let containerRef, mapProviderMock

  const defaultApp = { isLayoutReady: true, safeZoneInset: { top: 0, right: 0, bottom: 0, left: 0 }, breakpoint: 'desktop', syncMapPadding: true }
  const defaultMap = { mapStyle: { url: 'mock-style-url' }, mapSize: 'small', center: [0, 0], zoom: 5, bounds: [0, 0, 10, 10], isMapReady: true }

  beforeEach(() => {
    jest.clearAllMocks()
    global.requestAnimationFrame = cb => cb()
    containerRef = { current: {} }
    mapProviderMock = { initMap: jest.fn(), setPadding: jest.fn() }
    useConfig.mockReturnValue({ id: 'test-map', mapProvider: mapProviderMock })
    useApp.mockReturnValue(defaultApp)
    useMap.mockReturnValue(defaultMap)
  })

  it('renders without crashing', () => {
    const { container } = render(<MapController mapContainerRef={containerRef} />)
    expect(container).toBeDefined()
  })

  it('initializes map provider when all required props are present', () => {
    render(<MapController mapContainerRef={containerRef} />)
    expect(mapProviderMock.initMap).toHaveBeenCalledTimes(1)
    expect(mapProviderMock.initMap).toHaveBeenCalledWith(expect.objectContaining({
      container: containerRef.current,
      padding: defaultApp.safeZoneInset,
      center: [0, 0],
      zoom: 5,
      bounds: [0, 0, 10, 10],
      mapStyle: defaultMap.mapStyle,
      pixelRatio: window.devicePixelRatio * scaleFactor.small
    }))
  })

  it('does not initialize map if any required prop is missing', () => {
    const cases = [
      { safeZoneInset: null },
      { isLayoutReady: false },
      { mapStyle: null },
      { mapSize: null }
    ]

    for (const override of cases) {
      useApp.mockReturnValue({ ...defaultApp, ...override })
      useMap.mockReturnValue({ ...defaultMap, ...override })
      mapProviderMock.initMap.mockClear()

      render(<MapController mapContainerRef={containerRef} />)
      expect(mapProviderMock.initMap).not.toHaveBeenCalled()
    }
  })

  it('updates map padding when isMapReady and syncMapPadding are true', () => {
    render(<MapController mapContainerRef={containerRef} />)
    expect(scalePoints).toHaveBeenCalledWith(defaultApp.safeZoneInset, scaleFactor.small)
    expect(mapProviderMock.setPadding).toHaveBeenCalledWith(defaultApp.safeZoneInset)
  })

  it('does not update padding if syncMapPadding is false', () => {
    useApp.mockReturnValue({ ...defaultApp, syncMapPadding: false })
    render(<MapController mapContainerRef={containerRef} />)
    expect(mapProviderMock.setPadding).not.toHaveBeenCalled()
  })

  it('calls all map-related hooks', () => {
    render(<MapController mapContainerRef={containerRef} />)
    expect(useMapStateSync).toHaveBeenCalled()
    expect(useUserMoveTracking).toHaveBeenCalled()
    expect(useMapURLSync).toHaveBeenCalled()
    expect(useMapAnnouncements).toHaveBeenCalled()
    expect(useMapProviderOverrides).toHaveBeenCalled()
  })

  it('unmounts without errors', () => {
    const { unmount } = render(<MapController mapContainerRef={containerRef} />)
    expect(() => unmount()).not.toThrow()
  })
})
