import { renderHook } from '@testing-library/react'
import { useHoverCursor } from './useHoverCursor.js'

const makeProvider = () => ({ setHoverCursor: jest.fn() })

describe('useHoverCursor', () => {
  const dataLayers = [{ layerId: 'layer-a' }, { layerId: 'layer-b' }]

  it('calls setHoverCursor with layer IDs when enabled in select mode', () => {
    const mapProvider = makeProvider()
    renderHook(() => useHoverCursor(mapProvider, true, 'select', dataLayers))
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith(['layer-a', 'layer-b'])
  })

  it('calls setHoverCursor with layer IDs when enabled in auto mode', () => {
    const mapProvider = makeProvider()
    renderHook(() => useHoverCursor(mapProvider, true, 'auto', dataLayers))
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith(['layer-a', 'layer-b'])
  })

  it('calls setHoverCursor with empty array when disabled', () => {
    const mapProvider = makeProvider()
    renderHook(() => useHoverCursor(mapProvider, false, 'select', dataLayers))
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith([])
  })

  it('calls setHoverCursor with empty array in marker mode', () => {
    const mapProvider = makeProvider()
    renderHook(() => useHoverCursor(mapProvider, true, 'marker', dataLayers))
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith([])
  })

  it('clears cursor on unmount', () => {
    const mapProvider = makeProvider()
    const { unmount } = renderHook(() => useHoverCursor(mapProvider, true, 'select', dataLayers))
    mapProvider.setHoverCursor.mockClear()
    unmount()
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith([])
  })

  it('does not throw when setHoverCursor is absent', () => {
    expect(() => renderHook(() => useHoverCursor({}, true, 'select', dataLayers))).not.toThrow()
  })
})
