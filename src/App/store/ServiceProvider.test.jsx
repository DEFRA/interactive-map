import React from 'react'
import { renderHook } from '@testing-library/react'
import { ServiceProvider, ServiceContext } from './ServiceProvider.jsx'

import { createAnnouncer } from '../../services/announcer.js'
import { reverseGeocode } from '../../services/reverseGeocode.js'
import { closeApp } from '../../services/closeApp.js'

// Mock external dependencies
jest.mock('../../services/announcer.js', () => ({
  createAnnouncer: jest.fn(() => jest.fn())
}))

jest.mock('../../services/reverseGeocode.js', () => ({
  reverseGeocode: jest.fn(() => 'mockedReverseGeocode')
}))

jest.mock('../../services/closeApp.js', () => ({
  closeApp: jest.fn()
}))

// Mock config values including id + handleExitClick
jest.mock('../store/configContext.js', () => ({
  useConfig: jest.fn(() => ({
    id: 'test-app-123',
    handleExitClick: jest.fn()
  }))
}))

describe('ServiceProvider', () => {
  const mockEventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
  const wrapper = ({ children }) => <ServiceProvider eventBus={mockEventBus}>{children}</ServiceProvider>

  test('provides announce, reverseGeocode, eventBus, and closeApp via context', () => {
    const { result } = renderHook(() => React.useContext(ServiceContext), { wrapper })

    expect(createAnnouncer).toHaveBeenCalledTimes(1)
    expect(typeof result.current.announce).toBe('function')

    const output = result.current.reverseGeocode(10, { lat: 1, lng: 2 })
    expect(reverseGeocode).toHaveBeenCalledWith(10, { lat: 1, lng: 2 })
    expect(output).toBe('mockedReverseGeocode')

    expect(result.current.eventBus).toBe(mockEventBus)

    expect(typeof result.current.closeApp).toBe('function')
    expect(result.current.mapStatusRef).toBeDefined()
    expect(result.current.mapStatusRef.current).toBeNull()
  })

  test('renders children', () => {
    const { result } = renderHook(() => React.useContext(ServiceContext), {
      wrapper,
      initialProps: { children: <span>child</span> }
    })

    expect(result.current).toBeTruthy()
  })

  test('closeApp calls closeApp service with id and handleExitClick', () => {
    const mockHandleExitClick = jest.fn()
    const { useConfig } = require('../store/configContext.js')
    useConfig.mockReturnValue({ id: 'abc', handleExitClick: mockHandleExitClick })

    const { result } = renderHook(() => React.useContext(ServiceContext), { wrapper })

    result.current.closeApp()

    expect(closeApp).toHaveBeenCalledTimes(1)
    expect(closeApp).toHaveBeenCalledWith('abc', mockHandleExitClick, mockEventBus)
  })
})
