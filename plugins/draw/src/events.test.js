import { attachEvents } from './events.js'

jest.useFakeTimers()

const DRAW_EVENTS = ['create', 'editfinish', 'cancel', 'vertexselection', 'vertexchange', 'undochange', 'update', 'geometrychange', 'placementblocked']

const setup = (overrides = {}) => {
  const draw = {
    getMode: jest.fn(() => 'draw_polygon'),
    done: jest.fn(),
    cancel: jest.fn(),
    add: jest.fn(),
    get: jest.fn(() => ({ id: 'F' })),
    undo: jest.fn(),
    setGeometryValid: jest.fn(),
    setInvalid: jest.fn(),
    deleteVertex: jest.fn(),
    setSnapEnabled: jest.fn(),
    isSnapEnabled: jest.fn(() => false),
    changeMode: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
  const dispatch = jest.fn()
  const pluginState = { dispatch, feature: { id: 'F' }, tempFeature: { id: 'T' }, snap: false, ...overrides.pluginState }
  const mapProvider = { draw }
  const eventBus = { emit: jest.fn() }
  const buttonConfig = { drawDone: {}, drawCancel: {}, drawUndo: {}, drawDeletePoint: {}, drawSnap: {}, ...overrides.buttonConfig }
  const appState = { layoutRefs: { viewportRef: { current: 'viewport' } }, interfaceType: 'mouse' }
  const appConfig = { id: 'app' }
  const mapState = { mapSize: 'medium' }

  const detach = attachEvents({ appState, appConfig, mapState, pluginState, mapProvider, buttonConfig, eventBus })
  return { draw, dispatch, pluginState, mapProvider, eventBus, buttonConfig, detach }
}

const drawHandler = (draw, event) => draw.on.mock.calls.find(([name]) => name === event)[1]

beforeEach(() => jest.clearAllTimers())

describe('attachEvents – wiring', () => {
  test('assigns onClick to each configured button', () => {
    const { buttonConfig } = setup()
    expect(typeof buttonConfig.drawDone.onClick).toBe('function')
    expect(typeof buttonConfig.drawCancel.onClick).toBe('function')
    expect(typeof buttonConfig.drawUndo.onClick).toBe('function')
    expect(typeof buttonConfig.drawDeletePoint.onClick).toBe('function')
    expect(typeof buttonConfig.drawSnap.onClick).toBe('function')
  })

  test('subscribes to every draw event', () => {
    const { draw } = setup()
    DRAW_EVENTS.forEach((event) => {
      expect(draw.on).toHaveBeenCalledWith(event, expect.any(Function))
    })
  })

  test('tolerates missing optional buttons', () => {
    const { buttonConfig, detach } = setup({ buttonConfig: { drawDeletePoint: undefined, drawSnap: undefined } })
    expect(typeof buttonConfig.drawDone.onClick).toBe('function')
    expect(() => detach()).not.toThrow()
  })
})

describe('button handlers', () => {
  test('done finishes without resetting snap', () => {
    const { buttonConfig, draw, dispatch } = setup()
    buttonConfig.drawDone.onClick()
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'SET_SNAP', payload: false })
    expect(draw.setSnapEnabled).not.toHaveBeenCalledWith(false)
    expect(draw.done).toHaveBeenCalled()
  })

  test('cancel re-adds the feature when cancelling a vertex edit', () => {
    const { buttonConfig, draw, dispatch, eventBus } = setup()
    draw.getMode.mockReturnValue('edit_vertex')

    buttonConfig.drawCancel.onClick()

    expect(draw.add).toHaveBeenCalledWith({ id: 'F' })
    expect(draw.cancel).toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: null })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:cancelled', { id: 'F' })
  })

  test('cancel does not re-add outside a vertex edit', () => {
    const { buttonConfig, draw } = setup()
    draw.getMode.mockReturnValue('draw_polygon')
    buttonConfig.drawCancel.onClick()
    expect(draw.add).not.toHaveBeenCalled()
  })

  test('cancel does not re-add a vertex edit without a temp feature', () => {
    const { buttonConfig, draw } = setup({ pluginState: { tempFeature: null } })
    draw.getMode.mockReturnValue('edit_vertex')
    buttonConfig.drawCancel.onClick()
    expect(draw.add).not.toHaveBeenCalled()
  })

  test('undo and delete-vertex delegate to the adapter', () => {
    const { buttonConfig, draw } = setup()
    buttonConfig.drawUndo.onClick()
    buttonConfig.drawDeletePoint.onClick()
    expect(draw.undo).toHaveBeenCalled()
    expect(draw.deleteVertex).toHaveBeenCalled()
  })

  test('snap toggles state and syncs the adapter', () => {
    const { buttonConfig, draw, dispatch } = setup({ pluginState: { snap: false } })
    buttonConfig.drawSnap.onClick()
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SNAP' })
    expect(draw.setSnapEnabled).toHaveBeenCalledWith(true)
  })
})

describe('draw event handlers', () => {
  test('create resets state, preserves snap, disables mode asynchronously and emits', () => {
    const { draw, dispatch, eventBus } = setup()
    drawHandler(draw, 'create')({ id: 'new' })

    expect(dispatch).not.toHaveBeenCalledWith({ type: 'SET_SNAP', payload: false })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: null })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:created', { id: 'new' })

    jest.runAllTimers()
    expect(draw.changeMode).toHaveBeenCalledWith('disabled')
  })

  test('editfinish resets state and emits draw:edited', () => {
    const { draw, eventBus } = setup()
    drawHandler(draw, 'editfinish')({ id: 'edited' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:edited', { id: 'edited' })
    jest.runAllTimers()
    expect(draw.changeMode).toHaveBeenCalledWith('disabled')
  })

  test('re-opens an invalid finished shape in edit mode instead of creating it', () => {
    const { draw, eventBus } = setup()
    const bowtie = { id: 'bad', type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] } }
    drawHandler(draw, 'create')(bowtie)
    expect(eventBus.emit).not.toHaveBeenCalledWith('draw:created', bowtie)
    expect(draw._pendingCreateId).toBe('bad')
    jest.runAllTimers()
    const editCall = draw.changeMode.mock.calls.find(([mode]) => mode === 'edit_vertex')
    expect(editCall[1]).toEqual(expect.objectContaining({ featureId: 'bad' }))
    // the wired getSnapEnabled option delegates to the adapter
    editCall[1].getSnapEnabled()
    expect(draw.isSnapEnabled).toHaveBeenCalled()
  })

  test('edit finish of a drawn-then-fixed shape reports as a creation', () => {
    const { draw, eventBus } = setup()
    draw._pendingCreateId = 'bad'
    drawHandler(draw, 'editfinish')({ id: 'bad' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:created', { id: 'bad' })
    expect(draw._pendingCreateId).toBeNull()
  })

  test('cancel handler is a no-op', () => {
    const { draw } = setup()
    expect(() => drawHandler(draw, 'cancel')()).not.toThrow()
  })

  test('vertexselection dispatches and emits', () => {
    const { draw, dispatch, eventBus } = setup()
    drawHandler(draw, 'vertexselection')({ index: 2 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: 2 } })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:vertexselection', { index: 2 })
  })

  test('vertexchange resets the selected index with the new count', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'vertexchange')({ numVertices: 5 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: -1, numVertices: 5 } })
  })

  test('undochange dispatches the stack length', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'undochange')(4)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_UNDO_STACK_LENGTH', payload: 4 })
  })

  test('update emits draw:updated', () => {
    const { draw, eventBus } = setup()
    drawHandler(draw, 'update')({ id: 'u' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:updated', { id: 'u' })
  })
})

describe('geometrychange validation', () => {
  const squareFeature = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] }
  }
  const bowtieFeature = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] }
  }
  const collinearFeature = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [2, 0], [0, 0]]] }
  }

  test('ignores preview payloads that carry no change kind', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'geometrychange')({ coordinates: [[0, 0], [1, 1]] })
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: expect.anything() })
  })

  test('opens the gate for a valid geometry', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, kind: 'add', vertexIndex: 3 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: true })
  })

  test('gates a self-intersecting shape while drawing', () => {
    const { draw, dispatch, eventBus } = setup()
    drawHandler(draw, 'geometrychange')({ feature: bowtieFeature, kind: 'add', vertexIndex: 3 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: false })
    expect(draw.setGeometryValid).toHaveBeenCalledWith(false)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: expect.stringMatching(/intersect/i) }))
  })

  test('gates a zero-area shape while drawing', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'geometrychange')({ feature: collinearFeature, kind: 'add', vertexIndex: 2 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: false })
  })

  test('gates a self-intersecting move in edit mode (never reverts)', () => {
    const { draw, dispatch, eventBus } = setup()
    draw.getMode.mockReturnValue('edit_vertex')
    drawHandler(draw, 'geometrychange')({ feature: bowtieFeature, kind: 'move', vertexIndex: 2 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: false })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: expect.stringMatching(/intersect/i) }))
  })

  test('keeps a valid edit move (gate open)', () => {
    const { draw, dispatch } = setup()
    draw.getMode.mockReturnValue('edit_vertex')
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, kind: 'move', vertexIndex: 1 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: true })
  })

  test('applies the per-session user validator as a gate', () => {
    const { draw, dispatch, eventBus } = setup()
    draw._geometryValidator = () => ({ valid: false, reason: 'too big' })
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, kind: 'add', vertexIndex: 3 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GEOMETRY_VALID', payload: false })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: 'too big' }))
  })

  test('drives the invalid stroke from committed validity in edit mode only', () => {
    const { draw } = setup()
    draw.getMode.mockReturnValue('draw_polygon')
    drawHandler(draw, 'geometrychange')({ feature: bowtieFeature, kind: 'add', vertexIndex: 3 })
    expect(draw.setInvalid).not.toHaveBeenCalled() // draw mode: the adapter's live check owns the stroke

    draw.getMode.mockReturnValue('edit_vertex')
    drawHandler(draw, 'geometrychange')({ feature: bowtieFeature, kind: 'move', vertexIndex: 2 })
    expect(draw.setInvalid).toHaveBeenCalledWith(true)
  })

  test('relays a blocked placement to the public bus as draw:geometryinvalid', () => {
    const { draw, eventBus } = setup()
    const blocked = { kind: 'place', mode: 'draw_polygon', vertexIndex: 2, reason: 'outside region', feature: { type: 'Feature' } }
    drawHandler(draw, 'placementblocked')(blocked)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', blocked)
  })

  test('passes the current mode into the validation context', () => {
    const { draw } = setup()
    draw.getMode.mockReturnValue('draw_polygon')
    const validator = jest.fn(() => true)
    draw._geometryValidator = validator
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, kind: 'add', vertexIndex: 3 })
    expect(validator).toHaveBeenCalledWith(squareFeature, { kind: 'add', vertexIndex: 3, mode: 'draw_polygon' })
  })
})

describe('detach', () => {
  test('clears button handlers and unsubscribes from draw events', () => {
    const { detach, buttonConfig, draw } = setup()

    detach()

    expect(buttonConfig.drawDone.onClick).toBeNull()
    expect(buttonConfig.drawCancel.onClick).toBeNull()
    expect(buttonConfig.drawUndo.onClick).toBeNull()
    expect(buttonConfig.drawDeletePoint.onClick).toBeNull()
    expect(buttonConfig.drawSnap.onClick).toBeNull()
    DRAW_EVENTS.forEach((event) => {
      expect(draw.off).toHaveBeenCalledWith(event, expect.any(Function))
    })
  })
})
