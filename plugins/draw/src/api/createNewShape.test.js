import { createNewShape } from './createNewShape.js'
import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'

jest.mock('../utils/flattenStyleProperties.js', () => ({
  flattenStyleProperties: jest.fn(() => ({ _flat: true }))
}))

const makeContext = (overrides = {}) => {
  const dispatch = jest.fn()
  const eventBus = { emit: jest.fn() }
  const draw = { setSnapLayers: jest.fn(), changeMode: jest.fn(), isSnapEnabled: jest.fn(() => false) }
  const context = {
    appState: { layoutRefs: { viewportRef: { current: 'viewport' } }, interfaceType: 'mouse' },
    appConfig: { id: 'app' },
    pluginConfig: {},
    pluginState: { dispatch },
    mapState: { crossHair: true },
    mapProvider: { draw },
    services: { eventBus },
    ...overrides
  }
  return { context, dispatch, eventBus, draw }
}

beforeEach(() => jest.clearAllMocks())

describe('createNewShape', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = makeContext({ mapProvider: { draw: null } })
    createNewShape('draw_line')(context, 'f1')
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  // newLine.js/newPolygon.js only ever differ by this one argument — everything else about
  // the returned function's behaviour is already covered end-to-end by their own tests.
  test('threads the given mode through every call site: started event, changeMode, SET_MODE', () => {
    const { context, dispatch, eventBus, draw } = makeContext()
    createNewShape('draw_custom')(context, 'f1')

    expect(eventBus.emit).toHaveBeenCalledWith('draw:started', { mode: 'draw_custom' })
    expect(draw.changeMode).toHaveBeenCalledWith('draw_custom', expect.objectContaining({ featureId: 'f1' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: 'draw_custom' })
  })

  test('flattens style properties into the mode-change payload', () => {
    const { context, draw } = makeContext()
    createNewShape('draw_line')(context, 'f1', { stroke: 'red', fill: 'blue', strokeWidth: 3, properties: { name: 'x' } })

    expect(flattenStyleProperties).toHaveBeenCalledWith({ stroke: 'red', fill: 'blue', strokeWidth: 3 })
    expect(draw.changeMode.mock.calls[0][1].properties).toEqual({ name: 'x', _flat: true })
  })

  test('two factory instances stay independent — one mode never leaks into the other', () => {
    const { context: lineCtx, draw: lineDraw } = makeContext()
    const { context: polyCtx, draw: polyDraw } = makeContext()

    createNewShape('draw_line')(lineCtx, 'f1')
    createNewShape('draw_polygon')(polyCtx, 'f2')

    expect(lineDraw.changeMode).toHaveBeenCalledWith('draw_line', expect.anything())
    expect(polyDraw.changeMode).toHaveBeenCalledWith('draw_polygon', expect.anything())
  })
})
