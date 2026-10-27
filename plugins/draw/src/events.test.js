import { attachEvents } from './events.js'

jest.useFakeTimers()

const DRAW_EVENTS = ['create', 'editfinish', 'cancel', 'vertexselection', 'vertexchange', 'undochange', 'update', 'geometrychange', 'placementblocked', 'validitychange', 'canplacechange', 'interfacetypechange']

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
    nudgeSelectedVertex: jest.fn(),
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
  const hints = { show: jest.fn() }
  const announce = jest.fn()
  const buttonConfig = { drawDone: {}, drawCancel: {}, drawUndo: {}, drawDeletePoint: {}, drawSnap: {}, ...overrides.buttonConfig }
  const appState = { layoutRefs: { viewportRef: { current: 'viewport' } }, interfaceType: 'mouse' }
  const appConfig = { id: 'app' }
  const mapState = { mapSizeScale: 1.5 }

  const detach = attachEvents({ appState, appConfig, mapState, pluginState, mapProvider, buttonConfig, eventBus, hints, announce })
  return { draw, dispatch, pluginState, mapProvider, eventBus, hints, announce, buttonConfig, detach }
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

  test('cancel re-adds the feature when cancelling a vertex edit, and releases activeMoveTarget', () => {
    const { buttonConfig, draw, dispatch, eventBus, mapProvider } = setup()
    draw.getMode.mockReturnValue('edit_vertex')
    drawHandler(draw, 'vertexselection')({ index: 1 })

    buttonConfig.drawCancel.onClick()

    expect(draw.add).toHaveBeenCalledWith({ id: 'F' })
    expect(draw.cancel).toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: null })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:cancelled', { id: 'F' })
    expect(mapProvider.activeMoveTarget).toBeNull()
  })

  test('cancel re-adds the feature when cancelling a point edit too', () => {
    const { buttonConfig, draw } = setup()
    draw.getMode.mockReturnValue('edit_point')
    buttonConfig.drawCancel.onClick()
    expect(draw.add).toHaveBeenCalledWith({ id: 'F' })
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
    const { draw, eventBus, hints } = setup()
    const bowtie = { id: 'bad', type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] } }
    drawHandler(draw, 'create')(bowtie)
    expect(eventBus.emit).not.toHaveBeenCalledWith('draw:created', bowtie)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: expect.stringMatching(/intersect/i) }))
    expect(hints.show).toHaveBeenCalledWith(expect.stringMatching(/intersect/i))
    jest.runAllTimers()
    const editCall = draw.changeMode.mock.calls.find(([mode]) => mode === 'edit_vertex')
    expect(editCall[1]).toEqual(expect.objectContaining({ featureId: 'bad' }))
    // the wired getSnapEnabled option delegates to the adapter
    editCall[1].getSnapEnabled()
    expect(draw.isSnapEnabled).toHaveBeenCalled()
  })

  test('edit finish of a drawn-then-fixed shape reports as a creation', () => {
    const { draw, eventBus } = setup()
    // An invalid finished shape is re-opened for fixing (marks it as a pending creation)…
    const bowtie = { id: 'bad', type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] } }
    drawHandler(draw, 'create')(bowtie)
    jest.runAllTimers()
    // …so when its edit finishes, it reports as a creation, exactly once.
    drawHandler(draw, 'editfinish')({ id: 'bad' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:created', { id: 'bad' })
    drawHandler(draw, 'editfinish')({ id: 'bad' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:edited', { id: 'bad' })
  })

  test('cancel handler is a no-op', () => {
    const { draw } = setup()
    expect(() => drawHandler(draw, 'cancel')()).not.toThrow()
  })

  test('vertexselection dispatches, emits, and claims mapProvider.activeMoveTarget for MapControls', () => {
    const { draw, dispatch, eventBus, mapProvider } = setup()
    drawHandler(draw, 'vertexselection')({ index: 2 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: 2 } })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:vertexselection', { index: 2 })
    expect(mapProvider.activeMoveTarget).toMatchObject({ label: 'vertex' })

    mapProvider.activeMoveTarget.move(1, 0, true)
    expect(draw.nudgeSelectedVertex).toHaveBeenCalledWith(1, 0, true)
  })

  test('vertexselection releases activeMoveTarget when the index is deselected', () => {
    const { draw, mapProvider } = setup()
    drawHandler(draw, 'vertexselection')({ index: 2 })
    drawHandler(draw, 'vertexselection')({ index: -1 })
    expect(mapProvider.activeMoveTarget).toBeNull()
  })

  test('vertexchange resets the selected index with the new count and releases activeMoveTarget', () => {
    const { draw, dispatch, mapProvider } = setup()
    drawHandler(draw, 'vertexselection')({ index: 2 })
    drawHandler(draw, 'vertexchange')({ numVertices: 5 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: -1, numVertices: 5 } })
    expect(mapProvider.activeMoveTarget).toBeNull()
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
  const partDrawnFeature = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] }
  }

  test('ignores preview payloads that carry no phase', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'geometrychange')({ coordinates: [[0, 0], [1, 1]] })
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: expect.anything() })
  })

  test('opens the gate for a valid geometry', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, phase: 'change', vertexIndex: 3 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: 'valid' })
  })

  test('gates a self-intersecting shape while drawing', () => {
    const { draw, dispatch, eventBus, hints } = setup()
    drawHandler(draw, 'geometrychange')({ feature: bowtieFeature, phase: 'change', vertexIndex: 3 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: 'invalid' })
    expect(draw.setGeometryValid).toHaveBeenCalledWith(false)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: expect.stringMatching(/intersect/i) }))
    expect(hints.show).toHaveBeenCalledWith(expect.stringMatching(/intersect/i))
  })

  test('gates a part-drawn shape below the minimum vertex count, but skips the hint — an incomplete shape is expected, not a mistake', () => {
    const { draw, dispatch, eventBus, hints } = setup()
    drawHandler(draw, 'geometrychange')({ feature: partDrawnFeature, phase: 'change', vertexIndex: 1 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: 'invalid' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: expect.stringMatching(/at least 3 points/) }))
    expect(hints.show).not.toHaveBeenCalled()
  })

  test('gates a zero-area shape while drawing', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'geometrychange')({ feature: collinearFeature, phase: 'change', vertexIndex: 2 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: 'invalid' })
  })

  test('gates a self-intersecting move in edit mode (never reverts)', () => {
    const { draw, dispatch, eventBus } = setup()
    draw.getMode.mockReturnValue('edit_vertex')
    drawHandler(draw, 'geometrychange')({ feature: bowtieFeature, phase: 'change', vertexIndex: 2 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: 'invalid' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: expect.stringMatching(/intersect/i) }))
  })

  test('keeps a valid edit move (gate open)', () => {
    const { draw, dispatch } = setup()
    draw.getMode.mockReturnValue('edit_vertex')
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, phase: 'change', vertexIndex: 1 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: 'valid' })
  })

  test('applies the per-session user validator as a gate', () => {
    const { draw, dispatch, eventBus, hints } = setup()
    draw._commitValidator = () => ({ valid: false, reason: 'too big' })
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, phase: 'change', vertexIndex: 3 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: 'invalid' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: 'too big' }))
    expect(hints.show).toHaveBeenCalledWith('too big')
  })

  test('a user validator that vetoes with no reason (plain `false`) still emits, but skips the hint', () => {
    const { draw, dispatch, eventBus, hints } = setup()
    draw._commitValidator = () => false
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, phase: 'change', vertexIndex: 3 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: 'invalid' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: null }))
    expect(hints.show).not.toHaveBeenCalled()
  })

  test('drives the invalid stroke from committed validity in edit mode only', () => {
    const { draw } = setup()
    draw.getMode.mockReturnValue('draw_polygon')
    drawHandler(draw, 'geometrychange')({ feature: bowtieFeature, phase: 'change', vertexIndex: 3 })
    expect(draw.setInvalid).not.toHaveBeenCalled() // draw mode: the adapter's live check owns the stroke

    draw.getMode.mockReturnValue('edit_vertex')
    drawHandler(draw, 'geometrychange')({ feature: bowtieFeature, phase: 'change', vertexIndex: 2 })
    expect(draw.setInvalid).toHaveBeenCalledWith(true)
  })

  test('drives the invalid stroke from committed validity in a point edit too', () => {
    const { draw } = setup()
    draw.getMode.mockReturnValue('edit_point')
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, phase: 'change', vertexIndex: 0 })
    expect(draw.setInvalid).toHaveBeenCalledWith(false)
  })

  test('a live validity flip (edit drag) drives the Done gate alongside the commit check', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'validitychange')({ valid: false, reason: 'Shape must not intersect itself' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PREVIEW_VALID', payload: false })

    drawHandler(draw, 'validitychange')({ valid: true, reason: null })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PREVIEW_VALID', payload: true })
    // A live flip never writes the commit-level gate, so it can't enable Done while a
    // commit check is still pending or failing.
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_VALIDATION_STATUS' }))
    expect(draw.setGeometryValid).not.toHaveBeenCalled()
  })

  test('a live placement-veto flip drives the Add point gate', () => {
    const { draw, dispatch } = setup()
    drawHandler(draw, 'canplacechange')({ canPlace: false, reason: 'outside region' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CAN_ADD_POINT', payload: false })

    drawHandler(draw, 'canplacechange')({ canPlace: true, reason: null })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CAN_ADD_POINT', payload: true })
  })

  test('relays an interface-type change to the public bus', () => {
    const { draw, eventBus } = setup()
    drawHandler(draw, 'interfacetypechange')({ interfaceType: 'keyboard' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:interfacetypechange', { interfaceType: 'keyboard' })
  })

  test('relays a blocked placement to the public bus as draw:geometryinvalid, and as a hint', () => {
    const { draw, eventBus, hints } = setup()
    const blocked = { phase: 'place', mode: 'draw_polygon', vertexIndex: 2, reason: 'outside region', feature: { type: 'Feature' } }
    drawHandler(draw, 'placementblocked')(blocked)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', blocked)
    expect(hints.show).toHaveBeenCalledWith('outside region')
  })

  test('passes the current mode into the validation context', () => {
    const { draw } = setup()
    draw.getMode.mockReturnValue('draw_polygon')
    const validator = jest.fn(() => true)
    draw._commitValidator = validator
    drawHandler(draw, 'geometrychange')({ feature: squareFeature, phase: 'change', vertexIndex: 3 })
    expect(validator).toHaveBeenCalledWith(
      { feature: squareFeature, phase: 'change', vertexIndex: 3, mode: 'draw_polygon' },
      { signal: expect.any(AbortSignal), revision: expect.any(Number) }
    )
  })
})

describe('async geometry checks', () => {
  const square = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] } }
  const otherSquare = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] } }

  // A promise the test settles itself, so replies can be made to arrive in any order
  const deferred = () => {
    const handles = {}
    handles.promise = new Promise((resolve, reject) => Object.assign(handles, { resolve, reject }))
    return handles
  }
  const flush = () => Promise.resolve()
  const commit = (draw, feature, phase = 'change') => drawHandler(draw, 'geometrychange')({ feature, phase, vertexIndex: 0 })
  const lastStatus = (dispatch) => dispatch.mock.calls.filter(([a]) => a.type === 'SET_VALIDATION_STATUS').map(([a]) => a.payload).pop()

  test('blocks Done while a check is pending, then applies its result', async () => {
    const { draw, dispatch } = setup()
    const reply = deferred()
    draw.getMode.mockReturnValue('edit_vertex')
    draw._commitValidator = () => reply.promise

    commit(draw, square)
    expect(lastStatus(dispatch)).toBe('pending')
    expect(draw.setGeometryValid).toHaveBeenLastCalledWith(false)
    expect(draw.setInvalid).not.toHaveBeenCalled() // pending doesn't change the stroke

    reply.resolve({ valid: true })
    await flush()
    expect(lastStatus(dispatch)).toBe('valid')
    expect(draw.setGeometryValid).toHaveBeenLastCalledWith(true)
    expect(draw.setInvalid).toHaveBeenLastCalledWith(false)
  })

  test('a reply for an older change never changes the gate', async () => {
    const { draw, dispatch, eventBus } = setup()
    const first = deferred()
    const second = deferred()
    draw.getMode.mockReturnValue('edit_vertex')
    draw._commitValidator = jest.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    commit(draw, square)
    commit(draw, otherSquare)
    second.resolve({ valid: true })
    await flush()
    expect(lastStatus(dispatch)).toBe('valid')

    // The first change's reply arrives late, and says invalid — it's dropped
    first.resolve({ valid: false, reason: 'overlaps a parcel' })
    await flush()
    expect(lastStatus(dispatch)).toBe('valid')
    expect(eventBus.emit).not.toHaveBeenCalledWith('draw:geometryinvalid', expect.anything())
  })

  test('a new change aborts the previous check', () => {
    const { draw } = setup()
    const signals = []
    draw.getMode.mockReturnValue('edit_vertex')
    draw._commitValidator = (_event, { signal }) => { signals.push(signal); return new Promise(() => {}) }

    commit(draw, square)
    commit(draw, otherSquare)
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })

  test('passes an increasing revision with each change', () => {
    const { draw } = setup()
    const revisions = []
    draw._commitValidator = (_event, { revision }) => { revisions.push(revision); return true }
    commit(draw, square, 'change')
    commit(draw, otherSquare, 'change')
    expect(revisions[1]).toBeGreaterThan(revisions[0])
  })

  test('a rejected check keeps Done blocked without reporting the shape invalid', async () => {
    const { draw, dispatch, eventBus } = setup()
    const reply = deferred()
    draw._commitValidator = () => reply.promise
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    commit(draw, square, 'change')
    reply.reject(new Error('503'))
    await flush()
    await flush()
    expect(lastStatus(dispatch)).toBe('error')
    expect(draw.setGeometryValid).toHaveBeenLastCalledWith(false)
    expect(eventBus.emit).not.toHaveBeenCalledWith('draw:geometryinvalid', expect.anything())
    console.warn.mockRestore()
  })

  test('a callback that throws is an error result, not a crash', () => {
    const { draw, dispatch } = setup()
    draw._commitValidator = () => { throw new Error('boom') }
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => commit(draw, square, 'change')).not.toThrow()
    expect(lastStatus(dispatch)).toBe('error')
    console.warn.mockRestore()
  })

  test('a synchronous callback never shows the pending state', () => {
    const { draw, dispatch } = setup()
    draw._commitValidator = () => true
    commit(draw, square, 'change')
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'SET_VALIDATION_STATUS', payload: 'pending' })
    expect(lastStatus(dispatch)).toBe('valid')
  })

  test('the built-in rules run first, so a failing shape never reaches the callback', () => {
    const { draw } = setup()
    const validator = jest.fn(() => true)
    draw._commitValidator = validator
    const partDrawn = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] } }
    commit(draw, partDrawn, 'change')
    expect(validator).not.toHaveBeenCalled()
  })

  test('cancelling aborts a check in flight and drops its reply', async () => {
    const { draw, dispatch, buttonConfig } = setup()
    const reply = deferred()
    let signal
    draw._commitValidator = (_event, ctx) => { signal = ctx.signal; return reply.promise }

    commit(draw, square, 'change')
    buttonConfig.drawCancel.onClick()
    expect(signal.aborted).toBe(true)

    dispatch.mockClear()
    reply.resolve({ valid: true })
    await flush()
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_VALIDATION_STATUS' }))
  })

  test('a commit arriving after the session has ended is ignored', () => {
    const { draw } = setup()
    const validator = jest.fn(() => true)
    draw._commitValidator = validator
    draw.getMode.mockReturnValue('disabled')
    commit(draw, square, 'change')
    expect(validator).not.toHaveBeenCalled()
  })

  test('finishing reuses a passing result for the same shape, without checking again', () => {
    const { draw, eventBus } = setup()
    const validator = jest.fn(() => true)
    draw._commitValidator = validator
    // A draw-mode commit carries the placed vertices as an open ring
    const placed = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0]]] } }
    commit(draw, placed, 'change')
    expect(validator).toHaveBeenCalledTimes(1)

    drawHandler(draw, 'create')({ id: 'new', ...square })
    expect(validator).toHaveBeenCalledTimes(1)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:created', expect.objectContaining({ id: 'new' }))
  })

  test('finishing a different shape checks it with phase create', () => {
    const { draw } = setup()
    const validator = jest.fn(() => true)
    draw._commitValidator = validator
    drawHandler(draw, 'create')({ id: 'new', ...square })
    expect(validator).toHaveBeenCalledWith(expect.objectContaining({ phase: 'create' }), expect.anything())
  })

  test('finishing while a check is pending reopens the shape in edit mode, and the check carries on', async () => {
    const { draw, dispatch, eventBus } = setup()
    const reply = deferred()
    const validator = jest.fn(() => reply.promise)
    draw._commitValidator = validator
    draw.get.mockReturnValue({ id: 'new', ...square })

    commit(draw, square, 'change')
    drawHandler(draw, 'create')({ id: 'new', ...square })
    expect(validator).toHaveBeenCalledTimes(1) // the pending check is reused
    expect(eventBus.emit).not.toHaveBeenCalledWith('draw:created', expect.anything())

    jest.runAllTimers()
    expect(draw.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({ featureId: 'new' }))
    expect(lastStatus(dispatch)).toBe('pending')

    draw.getMode.mockReturnValue('edit_vertex')
    reply.resolve(true)
    await flush()
    expect(lastStatus(dispatch)).toBe('valid')

    drawHandler(draw, 'editfinish')({ id: 'new' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:created', { id: 'new' })
  })

  test('a point that fails its check reopens in point edit mode', () => {
    const { draw, eventBus } = setup()
    draw.getMode.mockReturnValue('draw_point')
    draw._commitValidator = () => ({ valid: false, reason: 'inside another parcel' })
    const point = { id: 'p1', type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] } }

    drawHandler(draw, 'create')(point)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:geometryinvalid', expect.objectContaining({ reason: 'inside another parcel', phase: 'create' }))
    jest.runAllTimers()
    expect(draw.changeMode).toHaveBeenCalledWith('edit_point', expect.objectContaining({ featureId: 'p1' }))
  })

  describe('screen reader announcements', () => {
    test('a check that settles straight away announces nothing new', () => {
      const { draw, announce } = setup()
      draw._commitValidator = () => ({ valid: false, reason: 'too big' })
      commit(draw, square, 'change')
      draw._commitValidator = () => true
      commit(draw, otherSquare, 'change')
      expect(announce).not.toHaveBeenCalled()
    })

    test('announces an async check starting, then passing', async () => {
      const { draw, announce } = setup()
      const reply = deferred()
      draw._commitValidator = () => reply.promise
      commit(draw, square, 'change')
      expect(announce).toHaveBeenLastCalledWith('Checking shape', 'action')
      reply.resolve(true)
      await flush()
      expect(announce).toHaveBeenLastCalledWith('Shape check passed', 'action')
    })

    test('announces a failure reason before the hint, so the hint does not repeat it', async () => {
      const { draw, announce, hints } = setup()
      const reply = deferred()
      draw._commitValidator = () => reply.promise
      commit(draw, square, 'change')
      reply.resolve({ valid: false, reason: 'Overlaps a neighbouring parcel' })
      await flush()
      expect(announce).toHaveBeenLastCalledWith('Overlaps a neighbouring parcel', 'action')
      expect(hints.show).toHaveBeenCalledWith('Overlaps a neighbouring parcel')
      expect(announce.mock.invocationCallOrder.at(-1)).toBeLessThan(hints.show.mock.invocationCallOrder[0])
    })

    test('announces a failure with no reason, and an error', async () => {
      const { draw, announce } = setup()
      const first = deferred()
      const second = deferred()
      draw._commitValidator = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      jest.spyOn(console, 'warn').mockImplementation(() => {})

      commit(draw, square, 'change')
      first.resolve(false)
      await flush()
      expect(announce).toHaveBeenLastCalledWith('Shape check failed', 'action')

      commit(draw, otherSquare, 'change')
      second.reject(new Error('503'))
      await flush()
      await flush()
      expect(announce).toHaveBeenLastCalledWith('Shape could not be checked', 'action')
      console.warn.mockRestore()
    })
  })

  test('survives the handlers being rebuilt mid-check', async () => {
    const first = setup()
    const { draw, eventBus } = first
    const reply = deferred()
    draw._commitValidator = () => reply.promise
    commit(draw, square, 'change')
    drawHandler(draw, 'create')({ id: 'new', ...square })
    jest.runAllTimers()

    // DrawInit re-attaches on every plugin state change
    first.detach()
    draw.on.mockClear()
    const dispatch = jest.fn()
    attachEvents({
      appState: { layoutRefs: { viewportRef: { current: 'viewport' } } },
      appConfig: { id: 'app' },
      mapState: {},
      pluginState: { dispatch },
      mapProvider: { draw },
      buttonConfig: { drawDone: {}, drawCancel: {}, drawUndo: {} },
      eventBus,
      hints: { show: jest.fn() }
    })

    draw.getMode.mockReturnValue('edit_vertex')
    reply.resolve(true)
    await flush()
    expect(lastStatus(dispatch)).toBe('valid')
    drawHandler(draw, 'editfinish')({ id: 'new' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:created', { id: 'new' })
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
