import { OLDrawAdapter } from './OLDrawAdapter.js'
import { createOLDraw } from './olDraw.js'

const fakeManager = () => ({
  changeMode: jest.fn(),
  getMode: jest.fn(() => 'disabled'),
  setInterfaceType: jest.fn(),
  done: jest.fn(),
  cancel: jest.fn(),
  undo: jest.fn(),
  deleteVertex: jest.fn(),
  get: jest.fn(() => 'feature'),
  add: jest.fn(),
  delete: jest.fn(),
  deleteAll: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  undoStack: { clear: jest.fn() },
  snap: { setActive: jest.fn(), setSnapLayers: jest.fn() }
})

jest.mock('./olDraw.js', () => ({
  createOLDraw: jest.fn(({ mapProvider }) => {
    mapProvider.draw = mapProvider._testManager
    return { remove: jest.fn() }
  })
}))

const setup = () => {
  const manager = fakeManager()
  const mapProvider = { _testManager: manager }
  const adapter = new OLDrawAdapter(mapProvider, {
    events: { MAP_SET_STYLE: 's' },
    eventBus: {},
    snapLayers: ['boundaries'],
    mapStyle: { id: 'default' }
  })
  return { manager, mapProvider, adapter }
}

afterEach(() => jest.clearAllMocks())

test('wires olDraw with the plugin options and keeps the manager before DrawInit overwrites it', () => {
  const { manager, adapter } = setup()
  expect(createOLDraw).toHaveBeenCalledWith(expect.objectContaining({
    pluginConfig: { snapLayers: ['boundaries'] },
    mapStyle: { id: 'default' }
  }))
  expect(adapter.getMode()).toBe('disabled')
  expect(manager.getMode).toHaveBeenCalled()
})

test('changeMode injects the mapProvider and the OL geometry type per draw mode', () => {
  const { manager, mapProvider, adapter } = setup()
  adapter.changeMode('draw_polygon', { featureId: 'f1' })
  expect(manager.changeMode).toHaveBeenCalledWith('draw_polygon', { featureId: 'f1', mapProvider, geometryType: 'Polygon' })
  adapter.changeMode('draw_line')
  expect(manager.changeMode).toHaveBeenCalledWith('draw_line', { mapProvider, geometryType: 'LineString' })
  adapter.changeMode('edit_vertex', { featureId: 'f1' })
  expect(manager.changeMode).toHaveBeenCalledWith('edit_vertex', { featureId: 'f1', mapProvider })
})

test('done and cancel clear the undo stack before delegating', () => {
  const { manager, adapter } = setup()
  adapter.done()
  adapter.cancel()
  expect(manager.undoStack.clear).toHaveBeenCalledTimes(2)
  expect(manager.done).toHaveBeenCalled()
  expect(manager.cancel).toHaveBeenCalled()
})

test('snap state is tracked locally and forwarded, tolerating a missing snap manager', () => {
  const { manager, adapter } = setup()
  expect(adapter.isSnapEnabled()).toBe(false)
  adapter.setSnapEnabled(true)
  expect(adapter.isSnapEnabled()).toBe(true)
  expect(manager.snap.setActive).toHaveBeenCalledWith(true)
  adapter.setSnapLayers(['x'])
  expect(manager.snap.setSnapLayers).toHaveBeenCalledWith(['x'])

  manager.snap = null
  adapter.setSnapEnabled(false)
  adapter.setSnapLayers(['y']) // no throw
  expect(adapter.isSnapEnabled()).toBe(false)
})

test('remaining calls delegate straight through; setFeatureProperty is a deliberate no-op', () => {
  const { manager, adapter } = setup()
  adapter.setInterfaceType('touch')
  expect(adapter.get('f1')).toBe('feature')
  adapter.add({ id: 'f2' })
  adapter.delete('f1')
  adapter.deleteAll()
  adapter.undo()
  adapter.deleteVertex()
  const handler = () => {}
  adapter.on('create', handler)
  adapter.off('create', handler)
  expect(adapter.setFeatureProperty('f1', 'stroke', '#000')).toBeUndefined()
  expect(manager.setInterfaceType).toHaveBeenCalledWith('touch')
  expect(manager.on).toHaveBeenCalledWith('create', handler)
  expect(manager.off).toHaveBeenCalledWith('create', handler)
  expect(manager.undo).toHaveBeenCalled()
  expect(manager.deleteVertex).toHaveBeenCalled()
})

test('remove runs the olDraw cleanup', () => {
  const { adapter } = setup()
  adapter.remove()
  expect(createOLDraw.mock.results.at(-1).value.remove).toHaveBeenCalled()
})
