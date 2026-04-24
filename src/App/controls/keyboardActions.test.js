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

const PAN_DELTA = 10
const NUDGE_PAN_DELTA = 5
const ZOOM_DELTA = 2
const NUDGE_ZOOM_DELTA = 1
const ZOOM_LEVEL = 12

const makeMapProvider = () => ({
  panBy: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  getCenter: jest.fn().mockReturnValue({ lng: 1, lat: 2 }),
  getZoom: jest.fn().mockReturnValue(ZOOM_LEVEL),
  getAreaDimensions: jest.fn().mockReturnValue('5km²'),
  highlightNextLabel: jest.fn(),
  highlightLabelAtCenter: jest.fn(),
  clearHighlightedLabel: jest.fn()
})

const makeActions = (overrides = {}) => {
  const mapProvider = makeMapProvider()
  const announce = jest.fn()
  const dispatch = jest.fn()
  const containerRef = { current: {} }
  const actions = createKeyboardActions(mapProvider, announce, {
    containerRef,
    dispatch,
    panDelta: PAN_DELTA,
    nudgePanDelta: NUDGE_PAN_DELTA,
    zoomDelta: ZOOM_DELTA,
    nudgeZoomDelta: NUDGE_ZOOM_DELTA,
    readMapText: true,
    ...overrides
  })
  return { actions, mapProvider, announce, dispatch, containerRef }
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { // NOSONAR: window required for broader browser support
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

beforeEach(() => {
  hasReverseGeocode.mockReturnValue(true)
})

describe('navigation actions', () => {
  test('showKeyboardControls dispatches correct action', () => {
    const { actions, dispatch, containerRef } = makeActions()
    actions.showKeyboardControls()
    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPEN_PANEL',
      payload: { panelId: 'keyboardHelp', props: { triggeringElement: containerRef.current } }
    })
  })

  test.each([
    ['panUp', { shiftKey: false }, [0, -PAN_DELTA]],
    ['panDown', { shiftKey: true }, [0, NUDGE_PAN_DELTA]],
    ['panLeft', { shiftKey: false }, [-PAN_DELTA, 0]],
    ['panRight', { shiftKey: true }, [NUDGE_PAN_DELTA, 0]]
  ])('%s uses correct deltas', (method, event, expected) => {
    const { actions, mapProvider } = makeActions()
    actions[method](event)
    expect(mapProvider.panBy).toHaveBeenCalledWith(expected)
  })

  test.each([
    ['zoomIn', { shiftKey: false }, ZOOM_DELTA],
    ['zoomOut', { shiftKey: true }, NUDGE_ZOOM_DELTA]
  ])('%s uses correct deltas', (method, event, expected) => {
    const { actions, mapProvider } = makeActions()
    actions[method](event)
    expect(mapProvider[method]).toHaveBeenCalledWith(expected)
  })

  test('clearSelection calls clearHighlightedLabel', () => {
    const { actions, mapProvider } = makeActions()
    actions.clearSelection()
    expect(mapProvider.clearHighlightedLabel).toHaveBeenCalled()
  })
})

describe('getInfo', () => {
  test('does nothing when reverseGeocode is not configured', async () => {
    hasReverseGeocode.mockReturnValue(false)
    const { actions, announce } = makeActions()
    await actions.getInfo()
    expect(reverseGeocode).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('reverseGeocode'))
  })

  test('performs reverse geocode and announces result with area', async () => {
    reverseGeocode.mockResolvedValue('London')
    const { actions, announce } = makeActions()
    await actions.getInfo()
    expect(reverseGeocode).toHaveBeenCalledWith(ZOOM_LEVEL, { lng: 1, lat: 2 })
    expect(announce).toHaveBeenCalledWith('London. Covering 5km².', 'core')
  })

  test('announces result without area when getAreaDimensions is absent', async () => {
    reverseGeocode.mockResolvedValue('Paris')
    const { actions, mapProvider, announce } = makeActions()
    delete mapProvider.getAreaDimensions
    await actions.getInfo()
    expect(announce).toHaveBeenCalledWith('Paris.', 'core')
  })
})

describe('label actions', () => {
  test('highlightNextLabel announces returned label', () => {
    const { actions, mapProvider, announce } = makeActions()
    mapProvider.highlightNextLabel.mockReturnValue('Label A')
    actions.highlightNextLabel({ key: 'A' })
    expect(announce).toHaveBeenCalledWith('Label A', 'core')
  })

  test('highlightNextLabel is no-op when readMapText is false', () => {
    const { actions, mapProvider, announce } = makeActions({ readMapText: false })
    actions.highlightNextLabel({ key: 'X' })
    expect(mapProvider.highlightNextLabel).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
  })

  test('highlightLabelAtCenter announces returned label', () => {
    const { actions, mapProvider, announce } = makeActions()
    mapProvider.highlightLabelAtCenter.mockReturnValue('Center Label')
    actions.highlightLabelAtCenter()
    expect(announce).toHaveBeenCalledWith('Center Label', 'core')
  })

  test('highlightLabelAtCenter is no-op when readMapText is false', () => {
    const { actions, mapProvider, announce } = makeActions({ readMapText: false })
    actions.highlightLabelAtCenter()
    expect(mapProvider.highlightLabelAtCenter).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
  })
})
