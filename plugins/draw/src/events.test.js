import { attachEvents } from './events.js'

jest.useFakeTimers()

const DRAW_EVENTS = ['create', 'editfinish', 'cancel', 'vertexselection', 'vertexchange', 'undochange', 'update']

const setup = (overrides = {}) => {
  const draw = {
    getMode: jest.fn(() => 'draw_polygon'),
    done: jest.fn(),
    cancel: jest.fn(),
    add: jest.fn(),
    undo: jest.fn(),
    deleteVertex: jest.fn(),
    setSnapEnabled: jest.fn(),
    changeMode: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
  const dispatch = jest.fn()
  const pluginState = { dispatch, feature: { id: 'F' }, tempFeature: { id: 'T' }, snap: false, ...overrides.pluginState }
  const mapProvider = { draw }
  const eventBus = { emit: jest.fn() }
  const buttonConfig = { drawDone: {}, drawCancel: {}, drawUndo: {}, drawDeletePoint: {}, drawSnap: {}, ...overrides.buttonConfig }

  const detach = attachEvents({ pluginState, mapProvider, buttonConfig, eventBus })
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
  test('done disables snap and finishes', () => {
    const { buttonConfig, draw, dispatch } = setup()
    buttonConfig.drawDone.onClick()
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SNAP', payload: false })
    expect(draw.setSnapEnabled).toHaveBeenCalledWith(false)
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
  test('create resets state, disables mode asynchronously and emits', () => {
    const { draw, dispatch, eventBus } = setup()
    drawHandler(draw, 'create')({ id: 'new' })

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SNAP', payload: false })
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
