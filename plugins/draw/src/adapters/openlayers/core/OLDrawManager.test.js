import { OLDrawManager } from './OLDrawManager.js'
import { STYLES_CHANGED_EVENT } from './internalEvents.js'
import { createDrawMode } from '../draw/DrawMode.js'
import { createEditMode } from '../edit/EditMode.js'
import { createEditPointMode } from '../point/editPointMode.js'
import { createDrawPointMode } from '../point/drawPointMode.js'
import { resolvePointSymbol } from '../point/pointSymbolImages.js'
import { createSnapManager } from '../snap/snapManager.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { createFakeMap } from '../__helpers__/harness.js'
import { logger } from '../../../../../../src/services/logger.js'
import { TOLERANCES } from '../defaults.js'
import OlFeature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import Icon from 'ol/style/Icon.js'

jest.mock('../draw/DrawMode.js', () => ({
  createDrawMode: jest.fn(() => ({ destroy: jest.fn(), done: jest.fn(), cancel: jest.fn(), undo: jest.fn(), deleteVertex: jest.fn(), nudgeSelectedVertex: jest.fn(), setInterfaceType: jest.fn(), setInvalid: jest.fn(), setDrawingPreviewProperty: jest.fn() }))
}))
jest.mock('../edit/EditMode.js', () => ({
  createEditMode: jest.fn(() => ({
    destroy: jest.fn(),
    done: jest.fn(),
    cancel: jest.fn(),
    undo: jest.fn(),
    deleteVertex: jest.fn(),
    nudgeSelectedVertex: jest.fn(),
    setInterfaceType: jest.fn(),
    setInvalid: jest.fn(),
    getVertexItems: jest.fn(() => ({ vertices: [[0, 0]], midpoints: [] })),
    selectVertex: jest.fn(),
    insertVertexAtMidpoint: jest.fn()
  }))
}))
jest.mock('../point/editPointMode.js', () => ({
  createEditPointMode: jest.fn(() => ({ destroy: jest.fn(), done: jest.fn(), cancel: jest.fn(), undo: jest.fn(), deleteVertex: jest.fn(), nudgeSelectedVertex: jest.fn(), setInterfaceType: jest.fn(), setInvalid: jest.fn() }))
}))
jest.mock('../point/drawPointMode.js', () => ({
  createDrawPointMode: jest.fn(() => ({ destroy: jest.fn(), done: jest.fn(), cancel: jest.fn(), undo: jest.fn(), setInterfaceType: jest.fn() }))
}))
jest.mock('../point/pointSymbolImages.js', () => ({
  resolvePointSymbol: jest.fn(() => Promise.resolve())
}))
jest.mock('../../../../../../src/services/logger.js', () => ({ logger: { error: jest.fn() } }))
jest.mock('../snap/snapManager.js', () => ({
  createSnapManager: jest.fn(() => ({ setIndicatorActive: jest.fn(), reattach: jest.fn(), updateColors: jest.fn(), destroy: jest.fn() }))
}))

const geojson = { type: 'Feature', id: 'f1', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] } }

const setup = (pluginConfig) => {
  const map = createFakeMap()
  const manager = new OLDrawManager(map, pluginConfig)
  return { map, manager }
}

afterEach(() => jest.clearAllMocks())

test('sets up the draw layer and the snap manager from the plugin config', () => {
  const { map } = setup({ snapLayers: ['boundaries'], snapRadius: 20 })
  expect(map.layers[0].get('layerId')).toBe('draw')
  expect(createSnapManager).toHaveBeenCalledWith(map, ['boundaries'], expect.any(Object), 20)

  setup() // defaults
  expect(createSnapManager).toHaveBeenLastCalledWith(expect.anything(), null, expect.any(Object), TOLERANCES.snapRadius)
})

test('draws point symbols with images from the map provider, before and after a map style change', () => {
  const canvas = document.createElement('canvas')
  const mapProvider = { getSymbolImage: jest.fn((imageId) => imageId === 'symbol-pin' ? canvas : undefined) }
  const symbolRegistry = { id: 'app-symbol-registry' }
  const manager = new OLDrawManager(createFakeMap(), {}, { mapProvider, symbolRegistry })
  expect(manager.symbolRegistry).toBe(symbolRegistry)

  const point = new OlFeature({ geometry: new Point([5, 5]), symbol: 'pin', symbolImageId: 'symbol-pin', symbolImageAnchor: [0.5, 1] })
  const iconOf = () => manager.styles.createFeatureStyle()(point)[0].getImage()
  expect(iconOf()).toBeInstanceOf(Icon)
  expect(iconOf().getImage(1)).toBe(canvas)

  manager.setMapStyle({ id: 'dark', mapColorScheme: 'dark' })
  expect(iconOf().getImage(1)).toBe(canvas)
  expect(mapProvider.getSymbolImage).toHaveBeenCalledWith('symbol-pin')
})

test('map style changes rebuild the styles and notify modes and snap', () => {
  const { map, manager } = setup()
  const onStyles = jest.fn()
  manager.on(STYLES_CHANGED_EVENT, onStyles)
  const before = manager.styles
  manager.setMapStyle({ id: 'dark', mapColorScheme: 'dark' })
  expect(manager.styles).not.toBe(before)
  expect(map.layers[0].getStyle()).toEqual(expect.any(Function))
  expect(manager.snap.updateColors).toHaveBeenCalledWith(manager.colors)
  expect(onStyles).toHaveBeenCalledWith(manager.styles)
})

describe('mode machine', () => {
  test.each([
    ['draw_polygon', createDrawMode],
    ['draw_line', createDrawMode],
    ['edit_vertex', createEditMode],
    ['edit_point', createEditPointMode]
  ])('%s creates its mode with snap injected, activates the indicator and reattaches snap last', async (name, factory) => {
    const { map, manager } = setup()
    manager.changeMode(name, { featureId: 'f1' })
    expect(manager.getMode()).toBe(name)
    expect(factory).toHaveBeenCalledWith({ map, manager, options: { featureId: 'f1', snap: manager.snap } })
    expect(manager.snap.setIndicatorActive).toHaveBeenCalledWith(true)
    expect(manager.snap.reattach).toHaveBeenCalled()
  })

  // draw_point gets an extra options key (resolvePointSymbol) the other modes don't — see
  // OLDrawManager.js's changeMode comment — so it's asserted separately rather than folded
  // into the table above.
  test('draw_point creates its mode with snap and resolvePointSymbol injected, activates the indicator and reattaches snap last', () => {
    const { map, manager } = setup()
    const mapProvider = { drawScale: 2 }
    manager.changeMode('draw_point', { featureId: 'f1', mapProvider })
    expect(manager.getMode()).toBe('draw_point')
    expect(createDrawPointMode).toHaveBeenCalledWith({ map, manager, options: { featureId: 'f1', mapProvider, snap: manager.snap, resolvePointSymbol: expect.any(Function) } })
    expect(manager.snap.setIndicatorActive).toHaveBeenCalledWith(true)
    expect(manager.snap.reattach).toHaveBeenCalled()

    // The injected hook resolves the point's symbol through the manager
    const updatePointSymbol = jest.spyOn(manager, 'updatePointSymbol').mockImplementation(() => {})
    const injected = createDrawPointMode.mock.calls.at(-1)[0].options.resolvePointSymbol
    const olFeature = { id: 'point-1' }
    injected(olFeature)
    expect(updatePointSymbol).toHaveBeenCalledWith(olFeature)
  })

  test('disabled destroys the previous mode and deactivates the indicator', () => {
    const { manager } = setup()
    manager.changeMode('draw_polygon')
    const instance = createDrawMode.mock.results[0].value
    manager.changeMode('disabled')
    expect(instance.destroy).toHaveBeenCalled()
    expect(manager.getMode()).toBe('disabled')
    expect(manager.snap.setIndicatorActive).toHaveBeenLastCalledWith(false)
  })

  test('operations delegate to the current mode instance and are safe without one', () => {
    const { manager } = setup()
    manager.done(); manager.undo(); manager.deleteVertex(); manager.nudgeSelectedVertex(1, 0, true); manager.setInterfaceType('touch'); manager.setInvalid(true) // no mode — no throw
    manager.setDrawingPreviewProperty('splitter', 'valid') // no mode — no throw
    expect(manager.getVertexItems()).toEqual({ vertices: [], midpoints: [] }) // no mode — safe default
    manager.selectVertex(1); manager.insertVertexAtMidpoint(1) // no mode — no throw

    manager.changeMode('draw_polygon')
    const instance = createDrawMode.mock.results[0].value
    manager.done()
    manager.undo()
    manager.deleteVertex()
    manager.nudgeSelectedVertex(1, 0, true)
    const emitted = jest.fn()
    manager.on('interfacetypechange', emitted)
    manager.setInterfaceType('touch')
    manager.setInvalid(true)
    manager.setDrawingPreviewProperty('splitter', 'valid')
    expect(instance.done).toHaveBeenCalled()
    expect(instance.undo).toHaveBeenCalled()
    expect(instance.deleteVertex).toHaveBeenCalled()
    expect(instance.nudgeSelectedVertex).toHaveBeenCalledWith(1, 0, true)
    expect(instance.setInterfaceType).toHaveBeenCalledWith('touch')
    // Parity with ML: an explicit interface-type write is echoed on the bus.
    expect(emitted).toHaveBeenCalledWith({ interfaceType: 'touch' })
    expect(instance.setInvalid).toHaveBeenCalledWith(true)
    expect(instance.setDrawingPreviewProperty).toHaveBeenCalledWith('splitter', 'valid')

    manager.cancel()
    expect(instance.cancel).toHaveBeenCalled()
    expect(manager.getMode()).toBe('disabled')
  })

  test('getVertexItems/selectVertex/insertVertexAtMidpoint delegate to the edit_vertex mode instance', () => {
    const { manager } = setup()
    manager.changeMode('edit_vertex', { featureId: 'f1' })
    const instance = createEditMode.mock.results[0].value

    expect(manager.getVertexItems()).toEqual({ vertices: [[0, 0]], midpoints: [] })
    manager.selectVertex(2)
    manager.insertVertexAtMidpoint(3)
    expect(instance.selectVertex).toHaveBeenCalledWith(2)
    expect(instance.insertVertexAtMidpoint).toHaveBeenCalledWith(3)
  })
})

test('undo stack changes are published on the adapter bus; off unsubscribes', () => {
  const { manager } = setup()
  const onUndoChange = jest.fn()
  manager.on(ADAPTER_EVENTS.UNDO_CHANGE, onUndoChange)
  manager.undoStack.push({ type: 'draw_vertex' })
  expect(onUndoChange).toHaveBeenCalledWith(1)
  manager.off(ADAPTER_EVENTS.UNDO_CHANGE, onUndoChange)
  manager.undoStack.push({ type: 'draw_vertex' })
  expect(onUndoChange).toHaveBeenCalledTimes(1)
})

test('several handlers can subscribe to the same event type and all fire', () => {
  const { manager } = setup()
  const h1 = jest.fn()
  const h2 = jest.fn()
  manager.on(ADAPTER_EVENTS.UNDO_CHANGE, h1)
  manager.on(ADAPTER_EVENTS.UNDO_CHANGE, h2) // same type reuses the existing handler set
  manager.undoStack.push({ type: 'draw_vertex' })
  expect(h1).toHaveBeenCalledWith(1)
  expect(h2).toHaveBeenCalledWith(1)
})

test('feature store delegation works with GeoJSON in and out', () => {
  const { manager } = setup()
  manager.add(geojson)
  expect(manager.get('f1')).toMatchObject({ id: 'f1' })
  manager.delete('f1')
  expect(manager.get('f1')).toBeNull()
  manager.add(geojson)
  manager.deleteAll()
  expect(manager.get('f1')).toBeNull()
})

test('remove tears everything down and silences the bus', () => {
  const { map, manager } = setup()
  manager.changeMode('draw_polygon')
  const instance = createDrawMode.mock.results[0].value
  const snap = manager.snap
  const listener = jest.fn()
  manager.on(STYLES_CHANGED_EVENT, listener)
  manager.remove()
  expect(instance.destroy).toHaveBeenCalled()
  expect(snap.destroy).toHaveBeenCalled()
  expect(map.removeLayer).toHaveBeenCalled()
  manager.emit(STYLES_CHANGED_EVENT, {})
  expect(listener).not.toHaveBeenCalled()
})

describe('updatePointSymbol', () => {
  test('resolves the point\'s symbol with this manager and its map provider', () => {
    const mapProvider = { map: {} }
    const manager = new OLDrawManager(createFakeMap(), {}, { mapProvider })
    const olFeature = { getId: () => 'p1' }
    manager.updatePointSymbol(olFeature)
    expect(resolvePointSymbol).toHaveBeenCalledWith({ manager, mapProvider, olFeature })
  })

  test('logs a failure rather than leaving the rejection unhandled', async () => {
    const error = new Error('rasterise failed')
    resolvePointSymbol.mockRejectedValueOnce(error)
    const manager = new OLDrawManager(createFakeMap(), {}, { mapProvider: { map: {} } })
    manager.updatePointSymbol({ getId: () => 'p1' })
    await Promise.resolve()
    await Promise.resolve()
    expect(logger.error).toHaveBeenCalledWith('[draw] failed to resolve point symbol', 'p1', error)
  })
})
