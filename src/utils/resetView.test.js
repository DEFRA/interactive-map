import { getConfiguredView, resetView, isAtResetViewTarget } from './resetView.js'

describe('getConfiguredView', () => {
  it('prefers bounds, then extent, then center and zoom', () => {
    expect(getConfiguredView({ bounds: [0, 0, 1, 1], extent: [2, 2, 3, 3], center: [5, 5], zoom: 4 })).toEqual({ bounds: [0, 0, 1, 1] })
    expect(getConfiguredView({ extent: [2, 2, 3, 3], center: [5, 5], zoom: 4 })).toEqual({ bounds: [2, 2, 3, 3] })
    expect(getConfiguredView({ center: [5, 5], zoom: 4 })).toEqual({ center: [5, 5], zoom: 4 })
  })

  it('returns null when nothing is configured', () => {
    expect(getConfiguredView({ zoom: 4 })).toBeNull()
  })
})

describe('resetView', () => {
  const createMapProvider = () => ({ fitToBounds: jest.fn(), setView: jest.fn() })

  it('fits to the configured bounds', () => {
    const mapProvider = createMapProvider()
    resetView(mapProvider, { bounds: [0, 0, 1, 1], center: [5, 5], zoom: 4 })
    expect(mapProvider.fitToBounds).toHaveBeenCalledWith([0, 0, 1, 1])
    expect(mapProvider.setView).not.toHaveBeenCalled()
  })

  it('sets the configured center and zoom when there are no bounds', () => {
    const mapProvider = createMapProvider()
    resetView(mapProvider, { center: [5, 5], zoom: 4 })
    expect(mapProvider.setView).toHaveBeenCalledWith({ center: [5, 5], zoom: 4 })
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
  })

  it('does nothing when no view is configured', () => {
    const mapProvider = createMapProvider()
    resetView(mapProvider, {})
    expect(mapProvider.fitToBounds).not.toHaveBeenCalled()
    expect(mapProvider.setView).not.toHaveBeenCalled()
  })
})

describe('isAtResetViewTarget', () => {
  // 10 screen pixels per map unit
  const mapProvider = { mapToScreen: ([x, y]) => ({ x: x * 10, y: y * 10 }) }
  const resetViewTarget = { center: [1, 2], zoom: 10 }

  it('is false without a target, a center or a map provider', () => {
    expect(isAtResetViewTarget({ center: [1, 2], zoom: 10, resetViewTarget: null }, mapProvider)).toBe(false)
    expect(isAtResetViewTarget({ zoom: 10, resetViewTarget }, mapProvider)).toBe(false)
    expect(isAtResetViewTarget({ center: [1, 2], zoom: 10, resetViewTarget }, null)).toBe(false)
  })

  it('is true within a pixel and a small zoom difference', () => {
    expect(isAtResetViewTarget({ center: [1.05, 2.05], zoom: 10.005, resetViewTarget }, mapProvider)).toBe(true)
  })

  it('is false once the center has moved more than a pixel', () => {
    expect(isAtResetViewTarget({ center: [1.2, 2], zoom: 10, resetViewTarget }, mapProvider)).toBe(false)
  })

  it('is false once the zoom has changed', () => {
    expect(isAtResetViewTarget({ center: [1, 2], zoom: 10.1, resetViewTarget }, mapProvider)).toBe(false)
  })
})
