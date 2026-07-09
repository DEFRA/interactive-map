import { split } from './split.js'
import { splitPolygon } from '../utils/spatial.js'

jest.mock('../utils/spatial.js', () => ({ splitPolygon: jest.fn() }))
jest.mock('../utils/debounce.js', () => ({ debounce: jest.fn((fn) => fn) }))

const makeContext = (overrides = {}) => {
  const dispatch = jest.fn()
  const eventBus = { emit: jest.fn() }
  const draw = {
    get: jest.fn(() => ({ id: 'poly' })),
    setSnapLayers: jest.fn(),
    changeMode: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    isSnapEnabled: jest.fn(() => true),
    setGeometryValid: jest.fn(),
    setFeatureProperty: jest.fn()
  }
  const context = {
    appState: { layoutRefs: { viewportRef: { current: 'viewport' } }, interfaceType: 'mouse' },
    appConfig: { id: 'app' },
    pluginState: { dispatch },
    mapState: { crossHair: true },
    mapProvider: { draw },
    services: { eventBus },
    ...overrides
  }
  return { context, dispatch, draw, eventBus }
}

const handlerFor = (draw, event) => draw.on.mock.calls.find(([name]) => name === event)?.[1]

beforeEach(() => jest.clearAllMocks())

describe('split', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, dispatch } = makeContext({ mapProvider: { draw: null } })
    expect(() => split(context, 'poly')).not.toThrow()
    expect(dispatch).not.toHaveBeenCalled()
  })

  test('sets up the splitter line drawing and registers listeners', () => {
    const { context, dispatch, draw } = makeContext()

    split(context, 'poly')

    expect(draw._geometryValidator).toBeNull()
    expect(draw.setSnapLayers).toHaveBeenCalledWith(['stroke-inactive.cold'])
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_SNAP_LAYERS', payload: true })
    expect(draw.changeMode).toHaveBeenCalledWith('draw_line', expect.objectContaining({
      container: 'viewport',
      addVertexButtonId: 'app-draw-add-point',
      interfaceType: 'mouse',
      crossHair: true,
      featureId: '_splitter',
      properties: { splitter: 'invalid' }
    }))
    expect(draw.on).toHaveBeenCalledWith('create', expect.any(Function))
    expect(draw.on).toHaveBeenCalledWith('geometrychange', expect.any(Function))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: 'draw_line' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split' } })
    expect(draw.changeMode.mock.calls[0][1].getSnapEnabled()).toBe(true)
  })

  test('merges option snapLayers with the outline layer', () => {
    const { context, draw } = makeContext()
    split(context, 'poly', { snapLayers: ['extra'] })
    expect(draw.setSnapLayers).toHaveBeenCalledWith(['stroke-inactive.cold', 'extra'])
  })

  test('finalising the line computes a valid split and emits the result', () => {
    const { context, dispatch, draw, eventBus } = makeContext()
    const polygonFeature = { id: 'poly' }
    const featureCollection = { type: 'FeatureCollection' }
    draw.get.mockReturnValue(polygonFeature)
    splitPolygon.mockReturnValue(featureCollection)

    split(context, 'poly')
    const onCreate = handlerFor(draw, 'create')
    const geojson = { id: 'line' }
    onCreate(geojson)

    expect(draw.off).toHaveBeenCalledWith('create', onCreate)
    expect(draw.off).toHaveBeenCalledWith('cancel', expect.any(Function))
    expect(draw.off).toHaveBeenCalledWith('geometrychange', expect.any(Function))
    expect(splitPolygon).toHaveBeenCalledWith(polygonFeature, geojson)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: true } })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:split', { originalFeatureId: 'poly', featureCollection })
  })

  test('cancelling the splitter line stops listening without computing a split', () => {
    const { context, draw } = makeContext()

    split(context, 'poly')
    const onCancel = handlerFor(draw, 'cancel')
    onCancel()

    expect(draw.off).toHaveBeenCalledWith('create', expect.any(Function))
    expect(draw.off).toHaveBeenCalledWith('cancel', onCancel)
    expect(draw.off).toHaveBeenCalledWith('geometrychange', expect.any(Function))
    expect(splitPolygon).not.toHaveBeenCalled()
  })

  test('a stale geometrychange listener cannot fire after the split line is created', () => {
    const { context, draw } = makeContext()
    splitPolygon.mockReturnValue({ type: 'FeatureCollection' })

    split(context, 'poly')
    const onCreate = handlerFor(draw, 'create')
    onCreate({ id: 'line' })

    // Real draw.off would deregister the handler; confirm split.js requested it
    // for every listener it registered, so none can leak into a later session.
    const offEvents = draw.off.mock.calls.map(([name]) => name)
    expect(offEvents).toEqual(expect.arrayContaining(['create', 'cancel', 'geometrychange']))
  })

  test('finalising the line computes an invalid split and does not emit', () => {
    const { context, dispatch, draw, eventBus } = makeContext()
    splitPolygon.mockReturnValue(null)

    split(context, 'poly')
    handlerFor(draw, 'create')({ id: 'line' })

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: false } })
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('geometry change updates validity via the adapter only — no mapbox-gl-draw internals', () => {
    const { context, dispatch, draw } = makeContext()
    splitPolygon.mockReturnValue({ type: 'FeatureCollection' })

    split(context, 'poly')
    const e = { coordinates: [[0, 0], [1, 1]] }
    handlerFor(draw, 'geometrychange')(e)

    expect(draw.setFeatureProperty).toHaveBeenCalledWith('_splitter', 'splitter', 'valid')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: true } })
    // A valid split line must allow completion: Done enabled (pluginState.geometryValid)
    // and the double-click/click-vertex finish gesture unblocked (map._drawGeometryValid).
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: true })
    expect(draw.setGeometryValid).toHaveBeenCalledWith(true)
  })

  test('an invalid split line blocks completion: disables Done and the finish gesture', () => {
    const { context, dispatch, draw } = makeContext()
    splitPolygon.mockReturnValue(null)

    split(context, 'poly')
    const e = { coordinates: [[0, 0], [1, 1]] }
    handlerFor(draw, 'geometrychange')(e)

    expect(draw.setFeatureProperty).toHaveBeenCalledWith('_splitter', 'splitter', 'invalid')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: false })
    expect(draw.setGeometryValid).toHaveBeenCalledWith(false)
  })

  test('geometry change ignores lines with fewer than two coordinates', () => {
    const { context, draw } = makeContext()
    split(context, 'poly')
    splitPolygon.mockClear()

    handlerFor(draw, 'geometrychange')({ coordinates: [[0, 0]] })

    expect(splitPolygon).not.toHaveBeenCalled()
  })

  // events.js's shared onGeometryChange also reacts to this commit event and — since
  // split nulls out the user validator — always marks it valid via the default rules,
  // clobbering split's own gate. DrawInit re-attaches that shared handler on every
  // pluginState change, so listener order on the bus isn't stable; the correction is
  // deferred one tick (a real setTimeout) so it's always the final word regardless.
  describe('commit-level (kind-ful) geometry change', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    test('re-validates from a valid split after the deferred tick', () => {
      const { context, dispatch, draw } = makeContext()
      splitPolygon.mockReturnValue({ type: 'FeatureCollection' })

      split(context, 'poly')
      const commitEvent = {
        kind: 'add',
        vertexIndex: 1,
        feature: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: {} }
      }
      handlerFor(draw, 'geometrychange')(commitEvent)
      jest.runAllTimers()

      expect(splitPolygon).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }
      }))
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: true })
      expect(draw.setGeometryValid).toHaveBeenCalledWith(true)
    })

    test('re-validates from an invalid split after the deferred tick', () => {
      const { context, dispatch, draw } = makeContext()
      splitPolygon.mockReturnValue(null)

      split(context, 'poly')
      handlerFor(draw, 'geometrychange')({
        kind: 'add',
        feature: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: {} }
      })
      jest.runAllTimers()

      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: false })
      expect(draw.setGeometryValid).toHaveBeenCalledWith(false)
    })

    test('with too few coordinates is ignored and never schedules a correction', () => {
      const { context, draw } = makeContext()
      split(context, 'poly')
      splitPolygon.mockClear()

      handlerFor(draw, 'geometrychange')({
        kind: 'add',
        feature: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0]] }, properties: {} }
      })
      jest.runAllTimers()

      expect(splitPolygon).not.toHaveBeenCalled()
    })

    test('does not touch state if the split session already ended before the tick fires', () => {
      const { context, dispatch, draw } = makeContext()
      splitPolygon.mockReturnValue({ type: 'FeatureCollection' })

      split(context, 'poly')
      handlerFor(draw, 'geometrychange')({
        kind: 'add',
        feature: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: {} }
      })
      // The split completes (or is cancelled) before the deferred tick runs.
      handlerFor(draw, 'create')({ id: 'line' })
      dispatch.mockClear()
      draw.setGeometryValid.mockClear()

      jest.runAllTimers()

      expect(dispatch).not.toHaveBeenCalled()
      expect(draw.setGeometryValid).not.toHaveBeenCalled()
    })
  })

  test('geometry change marks invalid splits', () => {
    const { context, dispatch, draw } = makeContext()
    splitPolygon.mockReturnValue(null)

    split(context, 'poly')
    const e = { coordinates: [[0, 0], [1, 1]] }

    expect(() => handlerFor(draw, 'geometrychange')(e)).not.toThrow()
    expect(draw.setFeatureProperty).toHaveBeenCalledWith('_splitter', 'splitter', 'invalid')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: false } })
  })
})