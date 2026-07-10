import { split } from './split.js'
import { splitPolygon } from '../utils/spatial.js'

jest.mock('../utils/spatial.js', () => ({ splitPolygon: jest.fn() }))

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
    setDrawingPreviewProperty: jest.fn()
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

const lineFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates } })

beforeEach(() => jest.clearAllMocks())

describe('split', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, dispatch } = makeContext({ mapProvider: { draw: null } })
    expect(() => split(context, 'poly')).not.toThrow()
    expect(dispatch).not.toHaveBeenCalled()
  })

  test('sets up the splitter line drawing, installs a validator, and registers listeners', () => {
    const { context, dispatch, draw } = makeContext()

    split(context, 'poly')

    expect(typeof draw._geometryValidator).toBe('function')
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
    expect(draw.on).toHaveBeenCalledWith('cancel', expect.any(Function))
    expect(draw.on).not.toHaveBeenCalledWith('geometrychange', expect.anything())
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: 'draw_line' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split' } })
    expect(draw.changeMode.mock.calls[0][1].getSnapEnabled()).toBe(true)
  })

  test('merges option snapLayers with the outline layer', () => {
    const { context, draw } = makeContext()
    split(context, 'poly', { snapLayers: ['extra'] })
    expect(draw.setSnapLayers).toHaveBeenCalledWith(['stroke-inactive.cold', 'extra'])
  })

  test('finalising the line computes a valid split, emits the result, and restores the previous validator', () => {
    const { context, dispatch, draw, eventBus } = makeContext()
    const polygonFeature = { id: 'poly' }
    const featureCollection = { type: 'FeatureCollection' }
    const previousValidator = jest.fn()
    draw._geometryValidator = previousValidator
    draw.get.mockReturnValue(polygonFeature)
    splitPolygon.mockReturnValue(featureCollection)

    split(context, 'poly')
    const onCreate = handlerFor(draw, 'create')
    const geojson = { id: 'line' }
    onCreate(geojson)

    expect(draw.off).toHaveBeenCalledWith('create', onCreate)
    expect(draw.off).toHaveBeenCalledWith('cancel', expect.any(Function))
    expect(splitPolygon).toHaveBeenCalledWith(polygonFeature, geojson)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: true } })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:split', { originalFeatureId: 'poly', featureCollection })
    expect(draw._geometryValidator).toBe(previousValidator)
  })

  test('cancelling the splitter line stops listening and restores the previous validator', () => {
    const { context, draw } = makeContext()
    const previousValidator = jest.fn()
    draw._geometryValidator = previousValidator

    split(context, 'poly')
    const onCancel = handlerFor(draw, 'cancel')
    onCancel()

    expect(draw.off).toHaveBeenCalledWith('create', expect.any(Function))
    expect(draw.off).toHaveBeenCalledWith('cancel', onCancel)
    expect(splitPolygon).not.toHaveBeenCalled()
    expect(draw._geometryValidator).toBe(previousValidator)
  })

  test('finalising the line computes an invalid split and does not emit', () => {
    const { context, dispatch, draw, eventBus } = makeContext()
    splitPolygon.mockReturnValue(null)

    split(context, 'poly')
    handlerFor(draw, 'create')({ id: 'line' })

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: false } })
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  describe('the installed draw._geometryValidator', () => {
    test('never blocks a hard placement veto (phase: place)', () => {
      const { context, dispatch, draw } = makeContext()
      split(context, 'poly')
      dispatch.mockClear()

      const result = draw._geometryValidator(lineFeature([[0, 0], [1, 1]]), { phase: 'place', mode: 'draw_line', vertexIndex: 1 })

      expect(result).toEqual({ valid: true })
      expect(splitPolygon).not.toHaveBeenCalled()
      expect(draw.setDrawingPreviewProperty).not.toHaveBeenCalled()
      expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ACTION' }))
    })

    test('never blocks the whole-feature finish check (phase: create)', () => {
      const { context, dispatch, draw } = makeContext()
      split(context, 'poly')
      dispatch.mockClear()

      const result = draw._geometryValidator(lineFeature([[0, 0], [1, 1]]), { phase: 'create', mode: 'draw_line' })

      expect(result).toEqual({ valid: true })
      expect(splitPolygon).not.toHaveBeenCalled()
      expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ACTION' }))
    })

    test('the live preview (phase: preview) only updates the visual colour, never Done-gating — even with just 1 placed vertex', () => {
      const { context, dispatch, draw } = makeContext()
      const polygonFeature = { id: 'poly' }
      draw.get.mockReturnValue(polygonFeature)
      splitPolygon.mockReturnValue({ type: 'FeatureCollection' })
      split(context, 'poly')
      dispatch.mockClear()

      // 1 placed vertex + the rubber-band cursor. validateDisplayedGeometry only
      // gates the built-in rules by placedCount, not a caller's own rule, so this
      // must still reach the validator (placedCount: 1, below MIN_VERTICES.LineString).
      const feature = lineFeature([[0, 0], [1, 1]])
      const result = draw._geometryValidator(feature, { phase: 'preview', mode: 'draw_line', placedCount: 1 })

      expect(splitPolygon).toHaveBeenCalledWith(polygonFeature, { id: '_splitter', geometry: feature.geometry })
      expect(draw.setDrawingPreviewProperty).toHaveBeenCalledWith('splitter', 'valid')
      // Committed Done-gating (pluginState.geometryValid / map._drawGeometryValid) must only
      // change on an actual commit — otherwise a live "what if you added a point here" check
      // could flicker a just-committed valid split back to disabled.
      expect(dispatch).not.toHaveBeenCalled()
      expect(draw.setGeometryValid).not.toHaveBeenCalled()
      expect(result).toEqual({ valid: true })
    })

    test('a committed vertex (phase: commit-add) updates both the visual colour and Done-gating', () => {
      const { context, dispatch, draw } = makeContext()
      splitPolygon.mockReturnValue(null)
      split(context, 'poly')

      const feature = lineFeature([[0, 0], [1, 1]])
      const result = draw._geometryValidator(feature, { phase: 'commit-add', mode: 'draw_line', vertexIndex: 1 })

      expect(draw.setDrawingPreviewProperty).toHaveBeenCalledWith('splitter', 'invalid')
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: false } })
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: false })
      expect(draw.setGeometryValid).toHaveBeenCalledWith(false)
      expect(result).toEqual({ valid: false, reason: expect.any(String) })
    })

    test('a line with fewer than two coordinates is treated as invalid without calling splitPolygon', () => {
      const { context, draw } = makeContext()
      split(context, 'poly')

      const feature = lineFeature([[0, 0]])
      const result = draw._geometryValidator(feature, { phase: 'preview', mode: 'draw_line', placedCount: 0 })

      expect(splitPolygon).not.toHaveBeenCalled()
      expect(draw.setDrawingPreviewProperty).toHaveBeenCalledWith('splitter', 'invalid')
      expect(result).toEqual({ valid: false, reason: expect.any(String) })
    })
  })
})
