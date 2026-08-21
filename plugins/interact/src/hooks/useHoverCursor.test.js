import { renderHook } from '@testing-library/react'
import { useHoverCursor } from './useHoverCursor.js'

const makeProvider = () => ({ setHoverCursor: jest.fn() })

describe('useHoverCursor', () => {
  const dataLayers = [{ layerId: 'layer-a' }, { layerId: 'layer-b' }]

  it('calls setHoverCursor with layer IDs when enabled with selectFeature mode', () => {
    const mapProvider = makeProvider()
    renderHook(() => useHoverCursor(mapProvider, true, ['selectFeature'], dataLayers))
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith(['layer-a', 'layer-b'])
  })

  it('calls setHoverCursor with layer IDs when selectFeature is combined with other interactionModes', () => {
    const mapProvider = makeProvider()
    renderHook(() => useHoverCursor(mapProvider, true, ['selectMarker', 'selectFeature'], dataLayers))
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith(['layer-a', 'layer-b'])
  })

  it('calls setHoverCursor with empty array when disabled', () => {
    const mapProvider = makeProvider()
    renderHook(() => useHoverCursor(mapProvider, false, ['selectFeature'], dataLayers))
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith([])
  })

  it('calls setHoverCursor with empty array when selectFeature is not in interactionModes', () => {
    const mapProvider = makeProvider()
    renderHook(() => useHoverCursor(mapProvider, true, ['selectMarker', 'placeMarker'], dataLayers))
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith([])
  })

  it('clears cursor on unmount', () => {
    const mapProvider = makeProvider()
    const { unmount } = renderHook(() => useHoverCursor(mapProvider, true, ['selectFeature'], dataLayers))
    mapProvider.setHoverCursor.mockClear()
    unmount()
    expect(mapProvider.setHoverCursor).toHaveBeenCalledWith([])
  })

  it('does not throw when setHoverCursor is absent', () => {
    expect(() => renderHook(() => useHoverCursor({}, true, ['selectFeature'], dataLayers))).not.toThrow()
  })

  describe('the "draw" wildcard entry', () => {
    it('expands to the adapter\'s concrete layer ids when getCommittedFeatureLayerIds exists', () => {
      const mapProvider = {
        setHoverCursor: jest.fn(),
        draw: { getCommittedFeatureLayerIds: jest.fn(() => ['draw-a-fill', 'draw-a-line']) }
      }
      renderHook(() => useHoverCursor(mapProvider, true, ['selectFeature'], [{ layerId: 'draw' }]))
      expect(mapProvider.setHoverCursor).toHaveBeenCalledWith(['draw-a-fill', 'draw-a-line'])
    })

    it('passes the literal id through when the adapter has no getCommittedFeatureLayerIds (e.g. OpenLayers)', () => {
      const mapProvider = { setHoverCursor: jest.fn(), draw: {} }
      renderHook(() => useHoverCursor(mapProvider, true, ['selectFeature'], [{ layerId: 'draw' }]))
      expect(mapProvider.setHoverCursor).toHaveBeenCalledWith(['draw'])
    })

    it('leaves non-draw layer ids untouched alongside a resolved draw entry', () => {
      const mapProvider = {
        setHoverCursor: jest.fn(),
        draw: { getCommittedFeatureLayerIds: jest.fn(() => ['draw-a-symbol']) }
      }
      renderHook(() => useHoverCursor(mapProvider, true, ['selectFeature'], [{ layerId: 'field-parcels' }, { layerId: 'draw' }]))
      expect(mapProvider.setHoverCursor).toHaveBeenCalledWith(['field-parcels', 'draw-a-symbol'])
    })
  })
})
