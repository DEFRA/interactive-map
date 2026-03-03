import React from 'react'
import { render, act } from '@testing-library/react'
import { MapProvider, MapContext } from './MapProvider.jsx'

// Mock mapReducer module correctly (self-contained factory)
jest.mock('./mapReducer.js', () => {
  const initialState = jest.fn((options) => ({
    mapStyle: null,
    mapSize: null,
    crossHair: null,
    isMapReady: false
  }))

  const setMapReady = jest.fn((state) => ({ ...state, isMapReady: true }))
  const setMapStyle = jest.fn((state, payload) => ({ ...state, mapStyle: payload }))
  const setMapSize = jest.fn((state, payload) => ({ ...state, mapSize: payload }))
  const updateCrossHair = jest.fn((state, payload) => ({ ...state, crossHair: payload }))

  const actionsMap = {
    SET_MAP_READY: setMapReady,
    SET_MAP_STYLE: setMapStyle,
    SET_MAP_SIZE: setMapSize,
    UPDATE_CROSS_HAIR: updateCrossHair
  }

  const reducer = jest.fn((state, action) => {
    const fn = actionsMap[action.type]
    return fn ? fn(state, action.payload) : state
  })

  return { initialState, actionsMap, reducer }
})

describe('MapProvider', () => {
  let capturedHandlers = {}
  let mockEventBus

  beforeEach(() => {
    localStorage.clear()
    capturedHandlers = {}

    mockEventBus = {
      on: jest.fn((event, handler) => {
        capturedHandlers[event] = handler
      }),
      off: jest.fn(),
      emit: jest.fn()
    }

    jest.clearAllMocks()
  })

  test('renders children and provides context', () => {
    let contextValue
    const Child = () => {
      contextValue = React.useContext(MapContext)
      return <div>ChildContent</div>
    }

    const { getByText } = render(
      <MapProvider options={{ id: 'map1', mapSize: '100x100', eventBus: mockEventBus }}>
        <Child />
      </MapProvider>
    )

    expect(getByText('ChildContent')).toBeInTheDocument()
    expect(contextValue).toHaveProperty('dispatch')
    expect(contextValue).toHaveProperty('mapStyle')
    expect(contextValue).toHaveProperty('mapSize')
    expect(contextValue).toHaveProperty('crossHair')
    expect(contextValue).toHaveProperty('isMapReady')
  })

  test('subscribes to MAP_READY (not MAP_PROVIDER_READY)', () => {
    render(
      <MapProvider options={{ id: 'map1', mapSize: '100x100', eventBus: mockEventBus }}>
        <div>Child</div>
      </MapProvider>
    )

    expect(mockEventBus.on).toHaveBeenCalledWith('map:ready', expect.any(Function))
    expect(mockEventBus.on).not.toHaveBeenCalledWith('map:providerready', expect.any(Function))
  })

  test('subscribes and unsubscribes to eventBus', () => {
    render(
      <MapProvider options={{ id: 'map1', mapSize: '100x100', eventBus: mockEventBus }}>
        <div>Child</div>
      </MapProvider>
    )

    expect(mockEventBus.on).toHaveBeenCalledWith('map:ready', expect.any(Function))
    expect(mockEventBus.on).toHaveBeenCalledWith('map:initmapstyles', expect.any(Function))
    expect(mockEventBus.on).toHaveBeenCalledWith('map:setstyle', expect.any(Function))
    expect(mockEventBus.on).toHaveBeenCalledWith('map:setsize', expect.any(Function))

    // Trigger handlers → covers reducer calls
    act(() => {
      capturedHandlers['map:ready']()
      capturedHandlers['map:setstyle']({ id: 'style1' })
      capturedHandlers['map:setsize']('300x300')
      capturedHandlers['map:initmapstyles']([{ id: 'style1' }])
    })
  })

  test('dispatches SET_MAP_READY when MAP_READY fires', () => {
    let contextValue
    const Child = () => {
      contextValue = React.useContext(MapContext)
      return null
    }

    render(
      <MapProvider options={{ id: 'map1', mapSize: '100x100', eventBus: mockEventBus }}>
        <Child />
      </MapProvider>
    )

    expect(contextValue.isMapReady).toBe(false)

    act(() => {
      capturedHandlers['map:ready']()
    })

    expect(contextValue.isMapReady).toBe(true)
  })

  test('emits map:sizechange when mapSize changes after initial value', () => {
    render(
      <MapProvider options={{ id: 'map1', mapSize: '100x100', eventBus: mockEventBus }}>
        <div>Child</div>
      </MapProvider>
    )

    // Initial mapSize set via initmapstyles — should NOT emit sizechange
    act(() => {
      capturedHandlers['map:initmapstyles']([{ id: 'style1' }])
    })

    const afterInitCalls = mockEventBus.emit.mock.calls.filter(([event]) => event === 'map:sizechange')
    expect(afterInitCalls).toHaveLength(0)

    // Subsequent size change — SHOULD emit sizechange
    act(() => {
      capturedHandlers['map:setsize']('large')
    })

    expect(mockEventBus.emit).toHaveBeenCalledWith('map:sizechange', { mapSize: 'large' })
  })

  test('initMapStyles uses options.mapSize if localStorage has no saved mapSize', () => {
    const options = { id: 'map1', mapSize: '200x200', eventBus: mockEventBus }
    const mapStyles = [{ id: 'style1' }]

    render(
      <MapProvider options={options}>
        <div>Child</div>
      </MapProvider>
    )

    act(() => {
      capturedHandlers['map:initmapstyles'](mapStyles)
    })

    expect(localStorage.getItem('map1:mapSize')).toBe('200x200')
    expect(localStorage.getItem('map1:mapStyleId')).toBe('style1')
  })

  test('initMapStyles uses savedMapSize from localStorage if present', () => {
    localStorage.setItem('map1:mapSize', '150x150')
    const options = { id: 'map1', mapSize: '200x200', eventBus: mockEventBus }
    const mapStyles = [{ id: 'style1' }]

    render(
      <MapProvider options={options}>
        <div>Child</div>
      </MapProvider>
    )

    act(() => {
      capturedHandlers['map:initmapstyles'](mapStyles)
    })

    expect(localStorage.getItem('map1:mapSize')).toBe('150x150')
    expect(localStorage.getItem('map1:mapStyleId')).toBe('style1')
  })

  test('handles dispatch actions correctly', () => {
    render(
      <MapProvider options={{ id: 'map1', mapSize: '100x100', eventBus: mockEventBus }}>
        <div>Child</div>
      </MapProvider>
    )

    act(() => {
      capturedHandlers['map:ready']()
      capturedHandlers['map:setstyle']({ id: 'style2' })
      capturedHandlers['map:setsize']('400x400')
    })
  })
})
