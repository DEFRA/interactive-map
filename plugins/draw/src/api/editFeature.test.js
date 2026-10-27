import { editFeature } from './editFeature.js'
import { getCommitChecks } from '../validation/commitChecks.js'

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
    mapState: { mapSizeScale: 1.5 },
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
    expect(eventBus.emit).toHaveBeenCalledWith('draw:editstart', { mode: 'edit_polygon', featureId: 'f1' })
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
    expect(eventBus.emit).toHaveBeenCalledWith('draw:editstart', { mode: 'edit_line', featureId: 'f1' })
  })

  // A Point has no ring of vertices — editing one goes through edit_point (relocate the
  // single coordinate), not edit_vertex, across every mode-name site this function touches.
  test('uses edit_point mode for a point feature', () => {
    const { context, dispatch, eventBus, draw } = makeContext()
    draw.get.mockReturnValue({ id: 'f1', geometry: { type: 'Point', coordinates: [0, 0] } })

    editFeature(context, 'f1')

    expect(eventBus.emit).toHaveBeenCalledWith('draw:editstart', { mode: 'edit_point', featureId: 'f1' })
    expect(draw.changeMode).toHaveBeenCalledWith('edit_point', expect.objectContaining({ featureId: 'f1' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: 'edit_point' })
    // Point geometry is always valid (validation/rules.js has no Point branch) — the gate
    // opens immediately, unlike a self-intersecting/zero-area polygon.
    expect(getCommitChecks(draw).state.status).toBe('valid')
  })

  test('stores a per-call onGeometryChange validator, overriding the plugin-level one', () => {
    const pluginOnGeometryChange = jest.fn()
    const onGeometryChange = jest.fn()
    const { context, draw } = makeContext({ pluginConfig: { snapLayers: ['pc-layer'], onGeometryChange: pluginOnGeometryChange } })
    editFeature(context, 'f1', { onGeometryChange })
    expect(draw._commitValidator).toBe(onGeometryChange)
  })

  test('stores a per-call onGeometryPreview validator, overriding the plugin-level one', () => {
    const onGeometryPreview = jest.fn(() => true)
    const { context, draw } = makeContext({ pluginConfig: { onGeometryPreview: jest.fn() } })
    editFeature(context, 'f1', { onGeometryPreview })
    draw._previewValidator({ phase: 'preview' })
    expect(onGeometryPreview).toHaveBeenCalledWith({ phase: 'preview' })
  })

  // The check's result is applied by events.js once it settles — here, its state is
  // what seeds the Done gate and the stroke.
  test('seeds the gate from the feature starting check (phase: edit-start)', () => {
    const { context, draw } = makeContext()
    // A valid square → gate opens.
    draw.get.mockReturnValue({ id: 'f1', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } })
    editFeature(context, 'f1')
    expect(getCommitChecks(draw).state).toEqual(expect.objectContaining({
      status: 'valid',
      context: { phase: 'edit-start', mode: 'edit_vertex' }
    }))
  })

  test('seeds the gate closed for an already self-intersecting feature', () => {
    const { context, draw } = makeContext()
    draw.get.mockReturnValue({ id: 'f1', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] } })
    editFeature(context, 'f1')
    expect(getCommitChecks(draw).state.status).toBe('invalid')
  })

  test('an async starting check leaves the gate pending until it settles', () => {
    const onGeometryChange = jest.fn(() => new Promise(() => {}))
    const { context, draw } = makeContext()
    draw.get.mockReturnValue({ id: 'f1', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } })
    editFeature(context, 'f1', { onGeometryChange })
    expect(onGeometryChange).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'edit-start', mode: 'edit_vertex' }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(getCommitChecks(draw).state.status).toBe('pending')
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
