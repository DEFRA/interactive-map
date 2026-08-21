import { newPoint } from './newPoint.js'

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

describe('newPoint', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = makeContext({ mapProvider: { draw: null } })
    newPoint(context, 'f1')
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('starts point placement, splitting symbol-config keys out of properties', () => {
    const { context, dispatch, eventBus, draw } = makeContext()

    newPoint(context, 'f1', {
      symbol: 'pin',
      symbolBackgroundColor: { outdoor: '#1d70b8' },
      properties: { name: 'x' },
      extra: 'opt'
    })

    expect(eventBus.emit).toHaveBeenCalledWith('draw:started', { mode: 'draw_point' })

    expect(draw.changeMode).toHaveBeenCalledWith('draw_point', expect.objectContaining({
      container: 'viewport',
      addVertexButtonId: 'app-draw-add-point',
      interfaceType: 'mouse',
      crossHair: true,
      featureId: 'f1',
      extra: 'opt',
      properties: { name: 'x', symbol: 'pin', symbolBackgroundColor: { outdoor: '#1d70b8' } }
    }))

    const opts = draw.changeMode.mock.calls[0][1]
    expect(opts.getSnapEnabled()).toBe(false)
    expect(draw.isSnapEnabled).toHaveBeenCalled()
    // Symbol keys are pulled off modeOptions entirely, not just copied into properties.
    expect(opts).not.toHaveProperty('symbol')
    expect(opts).not.toHaveProperty('symbolBackgroundColor')

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: 'draw_point' })
  })

  test('carries every recognised symbol-config key through to properties', () => {
    const { context, draw } = makeContext()
    const symbolStyle = {
      symbol: 'pin',
      symbolSvgContent: '<path/>',
      symbolBackgroundColor: '#fff',
      symbolForegroundColor: '#000',
      symbolHaloWidth: 2,
      symbolGraphic: 'g',
      symbolViewBox: '0 0 10 10',
      symbolAnchor: [0.5, 0.9]
    }
    newPoint(context, 'f1', symbolStyle)
    expect(draw.changeMode.mock.calls[0][1].properties).toEqual(symbolStyle)
  })

  test('omits symbol-config keys entirely when none are supplied', () => {
    const { context, draw } = makeContext()
    newPoint(context, 'f1')
    expect(draw.changeMode.mock.calls[0][1].properties).toEqual({})
  })

  test('prefers explicit option snapLayers and flags them', () => {
    const { context, draw, dispatch } = makeContext()
    newPoint(context, 'f1', { snapLayers: ['opt'] })
    expect(draw.setSnapLayers).toHaveBeenCalledWith(['opt'])
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_SNAP_LAYERS', payload: true })
  })

  test('falls back to the plugin config snapLayers', () => {
    const { context, draw } = makeContext()
    newPoint(context, 'f1')
    expect(draw.setSnapLayers).toHaveBeenCalledWith(['pc-layer'])
  })

  test('falls back to null when neither option nor config is set', () => {
    const { context, draw, dispatch } = makeContext({ pluginConfig: {} })
    newPoint(context, 'f1')
    expect(draw.setSnapLayers).toHaveBeenCalledWith(null)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_SNAP_LAYERS', payload: false })
  })

  test('stores a per-call onGeometryChange validator without leaking it into mode options', () => {
    const { context, draw } = makeContext()
    const onGeometryChange = jest.fn()
    newPoint(context, 'f1', { onGeometryChange })
    expect(draw._geometryValidator).toBe(onGeometryChange)
    expect(draw.changeMode.mock.calls[0][1]).not.toHaveProperty('onGeometryChange')
  })

  test('falls back to the plugin-level onGeometryChange validator', () => {
    const pluginOnGeometryChange = jest.fn()
    const { context, draw } = makeContext({ pluginConfig: { onGeometryChange: pluginOnGeometryChange } })
    newPoint(context, 'f1')
    expect(draw._geometryValidator).toBe(pluginOnGeometryChange)
  })
})
