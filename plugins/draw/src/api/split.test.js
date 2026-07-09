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
    isSnapEnabled: jest.fn(() => true)
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
    expect(splitPolygon).toHaveBeenCalledWith(polygonFeature, geojson)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: true } })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:split', { originalFeatureId: 'poly', featureCollection })
  })

  test('finalising the line computes an invalid split and does not emit', () => {
    const { context, dispatch, draw, eventBus } = makeContext()
    splitPolygon.mockReturnValue(null)

    split(context, 'poly')
    handlerFor(draw, 'create')({ id: 'line' })

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: false } })
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('geometry change updates validity and re-renders', () => {
    const { context, dispatch, draw } = makeContext()
    splitPolygon.mockReturnValue({ type: 'FeatureCollection' })

    split(context, 'poly')
    const render = jest.fn()
    const e = { coordinates: [[0, 0], [1, 1]], properties: {}, ctx: { store: { render } } }
    handlerFor(draw, 'geometrychange')(e)

    expect(e.properties.splitter).toBe('valid')
    expect(render).toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: true } })
  })

  test('geometry change ignores lines with fewer than two coordinates', () => {
    const { context, draw } = makeContext()
    split(context, 'poly')
    splitPolygon.mockClear()

    handlerFor(draw, 'geometrychange')({ coordinates: [[0, 0]], properties: {} })

    expect(splitPolygon).not.toHaveBeenCalled()
  })

  test('geometry change marks invalid splits and tolerates a missing render context', () => {
    const { context, dispatch, draw } = makeContext()
    splitPolygon.mockReturnValue(null)

    split(context, 'poly')
    const e = { coordinates: [[0, 0], [1, 1]], properties: {} }

    expect(() => handlerFor(draw, 'geometrychange')(e)).not.toThrow()
    expect(e.properties.splitter).toBe('invalid')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTION', payload: { name: 'split', isValid: false } })
  })
})