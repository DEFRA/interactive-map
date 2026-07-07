import { newLine } from './newLine.js'
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
    pluginConfig: { snapLayers: ['pc-layer'] },
    pluginState: { dispatch },
    mapState: { crossHair: true },
    mapProvider: { draw },
    services: { eventBus },
    ...overrides
  }
  return { context, dispatch, eventBus, draw }
}

beforeEach(() => jest.clearAllMocks())

describe('newLine', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = makeContext({ mapProvider: { draw: null } })
    newLine(context, 'f1')
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('starts line drawing with flattened style properties', () => {
    const { context, dispatch, eventBus, draw } = makeContext()

    newLine(context, 'f1', { stroke: 'red', fill: 'blue', strokeWidth: 3, properties: { name: 'x' }, extra: 'opt' })

    expect(eventBus.emit).toHaveBeenCalledWith('draw:started', { mode: 'draw_line' })
    expect(flattenStyleProperties).toHaveBeenCalledWith({ stroke: 'red', fill: 'blue', strokeWidth: 3 })

    expect(draw.changeMode).toHaveBeenCalledWith('draw_line', expect.objectContaining({
      container: 'viewport',
      addVertexButtonId: 'app-draw-add-point',
      interfaceType: 'mouse',
      crossHair: true,
      featureId: 'f1',
      extra: 'opt',
      properties: { name: 'x', _flat: true }
    }))

    const opts = draw.changeMode.mock.calls[0][1]
    expect(opts.getSnapEnabled()).toBe(false)
    expect(draw.isSnapEnabled).toHaveBeenCalled()

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: 'draw_line' })
  })

  test('prefers explicit option snapLayers and flags them', () => {
    const { context, draw, dispatch } = makeContext()
    newLine(context, 'f1', { snapLayers: ['opt'] })
    expect(draw.setSnapLayers).toHaveBeenCalledWith(['opt'])
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_SNAP_LAYERS', payload: true })
  })

  test('falls back to the plugin config snapLayers', () => {
    const { context, draw } = makeContext()
    newLine(context, 'f1')
    expect(draw.setSnapLayers).toHaveBeenCalledWith(['pc-layer'])
  })

  test('falls back to null when neither option nor config is set', () => {
    const { context, draw, dispatch } = makeContext({ pluginConfig: {} })
    newLine(context, 'f1')
    expect(draw.setSnapLayers).toHaveBeenCalledWith(null)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_SNAP_LAYERS', payload: false })
  })

  test('stores a per-call onGeometryChange validator without leaking it into mode options', () => {
    const { context, draw } = makeContext()
    const onGeometryChange = jest.fn()
    newLine(context, 'f1', { onGeometryChange })
    expect(draw._geometryValidator).toBe(onGeometryChange)
    expect(draw.changeMode.mock.calls[0][1]).not.toHaveProperty('onGeometryChange')
  })

  test('falls back to the plugin-level onGeometryChange validator', () => {
    const pluginOnGeometryChange = jest.fn()
    const { context, draw } = makeContext({ pluginConfig: { onGeometryChange: pluginOnGeometryChange } })
    newLine(context, 'f1')
    expect(draw._geometryValidator).toBe(pluginOnGeometryChange)
  })
})
