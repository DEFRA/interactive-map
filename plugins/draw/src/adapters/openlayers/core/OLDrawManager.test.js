import { OLDrawManager } from './OLDrawManager.js'
import { STYLES_CHANGED_EVENT } from './internalEvents.js'
import { createDrawMode } from '../draw/DrawMode.js'
import { createEditMode } from '../edit/EditMode.js'
import { createSnapManager } from '../snap/snapManager.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { createFakeMap } from '../__helpers__/harness.js'
import { TOLERANCES } from '../defaults.js'

jest.mock('../draw/DrawMode.js', () => ({
  createDrawMode: jest.fn(() => ({ destroy: jest.fn(), done: jest.fn(), cancel: jest.fn(), undo: jest.fn(), deleteVertex: jest.fn(), setInterfaceType: jest.fn(), setInvalid: jest.fn(), setDrawingPreviewProperty: jest.fn() }))
}))
jest.mock('../edit/EditMode.js', () => ({
  createEditMode: jest.fn(() => ({ destroy: jest.fn(), done: jest.fn(), cancel: jest.fn(), undo: jest.fn(), deleteVertex: jest.fn(), setInterfaceType: jest.fn(), setInvalid: jest.fn() }))
}))
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
    ['edit_vertex', createEditMode]
  ])('%s creates its mode with snap injected, activates the indicator and reattaches snap last', async (name, factory) => {
    const { map, manager } = setup()
    await manager.changeMode(name, { featureId: 'f1' })
    expect(manager.getMode()).toBe(name)
    expect(factory).toHaveBeenCalledWith({ map, manager, options: { featureId: 'f1', snap: manager.snap } })
    expect(manager.snap.setIndicatorActive).toHaveBeenCalledWith(true)
    expect(manager.snap.reattach).toHaveBeenCalled()
  })

  test('disabled destroys the previous mode and deactivates the indicator', async () => {
    const { manager } = setup()
    await manager.changeMode('draw_polygon')
    const instance = createDrawMode.mock.results[0].value
    await manager.changeMode('disabled')
    expect(instance.destroy).toHaveBeenCalled()
    expect(manager.getMode()).toBe('disabled')
    expect(manager.snap.setIndicatorActive).toHaveBeenLastCalledWith(false)
  })

  test('operations delegate to the current mode instance and are safe without one', async () => {
    const { manager } = setup()
    manager.done(); manager.undo(); manager.deleteVertex(); manager.setInterfaceType('touch'); manager.setInvalid(true) // no mode — no throw
    manager.setDrawingPreviewProperty('splitter', 'valid') // no mode — no throw

    await manager.changeMode('draw_polygon')
    const instance = createDrawMode.mock.results[0].value
    manager.done()
    manager.undo()
    manager.deleteVertex()
    const emitted = jest.fn()
    manager.on('interfacetypechange', emitted)
    manager.setInterfaceType('touch')
    manager.setInvalid(true)
    manager.setDrawingPreviewProperty('splitter', 'valid')
    expect(instance.done).toHaveBeenCalled()
    expect(instance.undo).toHaveBeenCalled()
    expect(instance.deleteVertex).toHaveBeenCalled()
    expect(instance.setInterfaceType).toHaveBeenCalledWith('touch')
    // Parity with ML: an explicit interface-type write is echoed on the bus.
    expect(emitted).toHaveBeenCalledWith({ interfaceType: 'touch' })
    expect(instance.setInvalid).toHaveBeenCalledWith(true)
    expect(instance.setDrawingPreviewProperty).toHaveBeenCalledWith('splitter', 'valid')

    manager.cancel()
    expect(instance.cancel).toHaveBeenCalled()
    expect(manager.getMode()).toBe('disabled')
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

test('remove tears everything down and silences the bus', async () => {
  const { map, manager } = setup()
  await manager.changeMode('draw_polygon')
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
