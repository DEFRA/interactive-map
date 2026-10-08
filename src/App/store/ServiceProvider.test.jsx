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

const mockShow = jest.fn()
jest.mock('../../services/hints.js', () => ({
  createHints: jest.fn(() => ({ show: mockShow, dismiss: jest.fn(), subscribe: jest.fn() }))
}))

jest.mock('../../services/reverseGeocode.js', () => ({
  reverseGeocode: jest.fn(() => 'mockedReverseGeocode')
}))

jest.mock('../../services/closeApp.js', () => ({
  closeApp: jest.fn()
}))

const mockViewportRef = { current: { focus: jest.fn(), getAttribute: jest.fn(), setAttribute: jest.fn() } }
jest.mock('../store/appContext.js', () => ({
  useApp: jest.fn(() => ({ layoutRefs: { viewportRef: mockViewportRef } }))
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
  const mockPluginRegistry = { getPlugin: jest.fn(() => ({ newPolygon: jest.fn() })) }
  const wrapper = ({ children }) => (
    <ServiceProvider eventBus={mockEventBus} pluginRegistry={mockPluginRegistry}>{children}</ServiceProvider>
  )

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

  test('focusMap names and focuses the viewport from layoutRefs', () => {
    const { result } = renderHook(() => React.useContext(ServiceContext), { wrapper })

    result.current.focusMap({ message: 'Map moved to Carlisle' })

    expect(mockViewportRef.current.setAttribute).toHaveBeenCalledWith('aria-label', 'Map moved to Carlisle')
    expect(mockViewportRef.current.focus).toHaveBeenCalled()
    expect(result.current.mapFocus.isHoldingAnnouncements()).toBe(true)
  })

  test('gives each map its own symbol registry, kept across renders, with that map\'s symbolDefaults', () => {
    const { useConfig } = jest.requireMock('../store/configContext.js')
    useConfig.mockReturnValue({ id: 'map-a', symbolDefaults: { backgroundColor: '#111111' } })
    const first = renderHook(() => React.useContext(ServiceContext), { wrapper })
    const firstRegistry = first.result.current.symbolRegistry
    first.rerender()
    expect(first.result.current.symbolRegistry).toBe(firstRegistry)

    useConfig.mockReturnValue({ id: 'map-b', symbolDefaults: { backgroundColor: '#222222' } })
    const second = renderHook(() => React.useContext(ServiceContext), { wrapper })
    expect(second.result.current.symbolRegistry).not.toBe(firstRegistry)
    expect(firstRegistry.getDefaults().backgroundColor).toBe('#111111')
    expect(second.result.current.symbolRegistry.getDefaults().backgroundColor).toBe('#222222')
  })

  test('gives each map its own pattern registry, kept across renders', () => {
    const first = renderHook(() => React.useContext(ServiceContext), { wrapper })
    const firstRegistry = first.result.current.patternRegistry
    first.rerender()
    expect(first.result.current.patternRegistry).toBe(firstRegistry)
    const second = renderHook(() => React.useContext(ServiceContext), { wrapper })
    expect(second.result.current.patternRegistry).not.toBe(firstRegistry)
  })

  test('renders children', () => {
    const { result } = renderHook(() => React.useContext(ServiceContext), {
      wrapper,
      initialProps: { children: <span>child</span> }
    })

    expect(result.current).toBeTruthy()
  })

  test('hints.show() delegates to createHints show', () => {
    const { result } = renderHook(() => React.useContext(ServiceContext), { wrapper })
    result.current.hints.show('<b>test</b>', { duration: 2000 })
    expect(mockShow).toHaveBeenCalledWith('<b>test</b>', { duration: 2000 })
  })

  test('getPlugin delegates to pluginRegistry.getPlugin', () => {
    const { result } = renderHook(() => React.useContext(ServiceContext), { wrapper })

    const plugin = result.current.getPlugin('draw')

    expect(mockPluginRegistry.getPlugin).toHaveBeenCalledWith('draw')
    expect(plugin).toEqual({ newPolygon: expect.any(Function) })
  })

  test('getPlugin returns undefined when no pluginRegistry is provided', () => {
    const noRegistryWrapper = ({ children }) => <ServiceProvider eventBus={mockEventBus}>{children}</ServiceProvider>
    const { result } = renderHook(() => React.useContext(ServiceContext), { wrapper: noRegistryWrapper })

    expect(result.current.getPlugin('draw')).toBeUndefined()
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
