import { editFeature } from './editFeature.js'

jest.mock('../defaults.js', () => ({ MAP_SIZE_SCALES: { medium: 1.5, large: 2 } }))

const makeContext = (overrides = {}) => {
  const dispatch = jest.fn()
  const eventBus = { emit: jest.fn() }
  const draw = {
    get: jest.fn(() => ({ id: 'f1', geometry: { type: 'Polygon' } })),
    setSnapLayers: jest.fn(),
    changeMode: jest.fn(),
    isSnapEnabled: jest.fn(() => true)
  }
  const context = {
    appState: { layoutRefs: { viewportRef: { current: 'viewport' } }, interfaceType: 'mouse' },
    appConfig: { id: 'app' },
    mapState: { mapSize: 'medium' },
    pluginConfig: { snapLayers: ['pc-layer'] },
    pluginState: { dispatch },
    mapProvider: { draw },
    services: { eventBus },
    ...overrides
  }
  return { context, dispatch, eventBus, draw }
}

beforeEach(() => jest.clearAllMocks())

describe('editFeature', () => {
  test('returns false when there is no draw instance', () => {
    const { context } = makeContext({ mapProvider: { draw: null } })
    expect(editFeature(context, 'f1')).toBe(false)
  })

  test('returns false when the feature does not exist', () => {
    const { context, draw, eventBus } = makeContext()
    draw.get.mockReturnValue(undefined)
    expect(editFeature(context, 'missing')).toBe(false)
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('enters edit mode for a polygon and wires all options', () => {
    const { context, dispatch, eventBus, draw } = makeContext()

    const result = editFeature(context, 'f1')

    expect(result).toBe(true)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:editstart', { mode: 'edit_polygon' })
    expect(draw.setSnapLayers).toHaveBeenCalledWith(['pc-layer'])
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_SNAP_LAYERS', payload: true })

    expect(draw.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({
      container: 'viewport',
      deleteVertexButtonId: 'app-draw-delete-point',
      undoButtonId: 'app-draw-undo',
      isPanEnabled: true,
      interfaceType: 'mouse',
      scale: 1.5,
      featureId: 'f1'
    }))

    const opts = draw.changeMode.mock.calls[0][1]
    expect(opts.getSnapEnabled()).toBe(true)
    expect(draw.isSnapEnabled).toHaveBeenCalled()

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FEATURE', payload: { feature: { id: 'f1', geometry: { type: 'Polygon' } }, tempFeature: { id: 'f1', geometry: { type: 'Polygon' } } } })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: 'edit_vertex' })
  })

  test('uses edit_line mode for a line string', () => {
    const { context, eventBus, draw } = makeContext()
    draw.get.mockReturnValue({ id: 'f1', geometry: { type: 'LineString' } })
    editFeature(context, 'f1')
    expect(eventBus.emit).toHaveBeenCalledWith('draw:editstart', { mode: 'edit_line' })
  })

  test('stores a per-call onGeometryChange validator, overriding the plugin-level one', () => {
    const pluginOnGeometryChange = jest.fn()
    const onGeometryChange = jest.fn()
    const { context, draw } = makeContext({ pluginConfig: { snapLayers: ['pc-layer'], onGeometryChange: pluginOnGeometryChange } })
    editFeature(context, 'f1', { onGeometryChange })
    expect(draw._geometryValidator).toBe(onGeometryChange)
  })

  test('seeds the geometry-valid gate from the feature starting validity', () => {
    const { context, dispatch, draw } = makeContext()
    // A valid square → gate opens.
    draw.get.mockReturnValue({ id: 'f1', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } })
    editFeature(context, 'f1')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: true })
  })

  test('seeds the gate closed for an already self-intersecting feature', () => {
    const { context, dispatch, draw } = makeContext()
    draw.get.mockReturnValue({ id: 'f1', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] } })
    editFeature(context, 'f1')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: false })
  })

  test('seeds the stroke alongside the gate — an invalid feature opens edit mode dashed', () => {
    const { context, draw } = makeContext()
    draw.setInvalid = jest.fn()
    draw.get.mockReturnValue({ id: 'f1', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] } })
    editFeature(context, 'f1')
    expect(draw.setInvalid).toHaveBeenCalledWith(true)

    draw.setInvalid.mockClear()
    draw.get.mockReturnValue({ id: 'f1', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } })
    editFeature(context, 'f1')
    expect(draw.setInvalid).toHaveBeenCalledWith(false)
  })

  test('disables panning for the keyboard interface', () => {
    const { context, draw } = makeContext({
      appState: { layoutRefs: { viewportRef: { current: 'viewport' } }, interfaceType: 'keyboard' }
    })
    editFeature(context, 'f1')
    expect(draw.changeMode.mock.calls[0][1].isPanEnabled).toBe(false)
  })

  test('prefers explicit option snapLayers over the plugin config', () => {
    const { context, draw, dispatch } = makeContext()
    editFeature(context, 'f1', { snapLayers: ['opt-layer'] })
    expect(draw.setSnapLayers).toHaveBeenCalledWith(['opt-layer'])
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_SNAP_LAYERS', payload: true })
  })

  test('falls back to null snapLayers when neither option nor config is set', () => {
    const { context, draw, dispatch } = makeContext({ pluginConfig: {} })
    editFeature(context, 'f1')
    expect(draw.setSnapLayers).toHaveBeenCalledWith(null)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_SNAP_LAYERS', payload: false })
  })
})
