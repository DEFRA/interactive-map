import { createKeyboardActions } from './keyboardActions.js'
import { reverseGeocode, hasReverseGeocode } from '../../services/reverseGeocode.js'
import { logger } from '../../services/logger.js'

jest.mock('../../services/reverseGeocode.js', () => ({
  reverseGeocode: jest.fn(),
  hasReverseGeocode: jest.fn()
}))

jest.mock('../../services/logger.js', () => ({
  logger: { warn: jest.fn() }
}))

describe('createKeyboardActions', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })
    })
  })

  const panDelta = 10
  const nudgePanDelta = 5
  const zoomDelta = 2
  const nudgeZoomDelta = 1

  let mapProvider, announce, dispatch, containerRef, readMapText

  const create = () =>
    createKeyboardActions(mapProvider, announce, {
      containerRef,
      dispatch,
      panDelta,
      nudgePanDelta,
      zoomDelta,
      nudgeZoomDelta,
      readMapText
    })

  beforeEach(() => {
    mapProvider = {
      panBy: jest.fn(),
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      getCenter: jest.fn().mockReturnValue({ lng: 1, lat: 2 }),
      getZoom: jest.fn().mockReturnValue(12),
      getAreaDimensions: jest.fn().mockReturnValue('5km²'),
      highlightNextLabel: jest.fn(),
      highlightLabelAtCenter: jest.fn(),
      clearHighlightedLabel: jest.fn()
    }

    announce = jest.fn()
    dispatch = jest.fn()
    containerRef = { current: {} }
    readMapText = true
    hasReverseGeocode.mockReturnValue(true)
  })

  test('showKeyboardControls dispatches correct action', () => {
    create().showKeyboardControls()
    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPEN_PANEL',
      payload: {
        panelId: 'keyboardHelp',
        props: { triggeringElement: containerRef.current }
      }
    })
  })

  test.each([
    ['panUp', { shiftKey: false }, [0, -panDelta]],
    ['panDown', { shiftKey: true }, [0, nudgePanDelta]],
    ['panLeft', { shiftKey: false }, [-panDelta, 0]],
    ['panRight', { shiftKey: true }, [nudgePanDelta, 0]]
  ])('%s uses correct deltas', (method, event, expected) => {
    create()[method](event)
    expect(mapProvider.panBy).toHaveBeenCalledWith(expected)
  })

  test.each([
    ['zoomIn', { shiftKey: false }, zoomDelta],
    ['zoomOut', { shiftKey: true }, nudgeZoomDelta]
  ])('%s uses correct deltas', (method, event, expected) => {
    create()[method](event)
    expect(mapProvider[method]).toHaveBeenCalledWith(expected)
  })

  test('getInfo does nothing when reverseGeocode is not configured', async () => {
    hasReverseGeocode.mockReturnValue(false)
    await create().getInfo()
    expect(reverseGeocode).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('reverseGeocode'))
  })

  test('getInfo performs reverse geocode, places marker, and announces', async () => {
    reverseGeocode.mockResolvedValue('London')
    await create().getInfo()

    expect(reverseGeocode).toHaveBeenCalledWith(12, { lng: 1, lat: 2 })

    expect(announce).toHaveBeenCalledWith('London. Covering 5km².', 'core')
  })

  test('getInfo handles missing getAreaDimensions', async () => {
    delete mapProvider.getAreaDimensions
    reverseGeocode.mockResolvedValue('Paris')

    await create().getInfo()
    expect(announce).toHaveBeenCalledWith('Paris.', 'core')
  })

  test('highlightNextLabel announces returned label', () => {
    mapProvider.highlightNextLabel.mockReturnValue('Label A')
    create().highlightNextLabel({ key: 'A' })

    expect(announce).toHaveBeenCalledWith('Label A', 'core')
  })

  test('highlightNextLabel no-op when readMapText=false', () => {
    readMapText = false
    create().highlightNextLabel({ key: 'X' })

    expect(mapProvider.highlightNextLabel).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
  })

  test('highlightLabelAtCenter announces label', () => {
    mapProvider.highlightLabelAtCenter.mockReturnValue('Center Label')
    create().highlightLabelAtCenter()

    expect(announce).toHaveBeenCalledWith('Center Label', 'core')
  })

  test('highlightLabelAtCenter no-op when readMapText=false', () => {
    readMapText = false
    create().highlightLabelAtCenter()

    expect(mapProvider.highlightLabelAtCenter).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
  })

  test('clearSelection calls correct method', () => {
    create().clearSelection()
    expect(mapProvider.clearHighlightedLabel).toHaveBeenCalled()
  })
})
