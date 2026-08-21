import { createPointSelectionState } from './pointSelectionState.js'
import { createFakeManager, pointFeature } from '../__helpers__/harness.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'

const setup = (interfaceType) => {
  const manager = createFakeManager()
  const olFeature = pointFeature([5, 5])
  const store = { toGeoJSON: jest.fn(() => ({ id: 'f1' })) }
  const selection = createPointSelectionState({ manager, store, olFeature, interfaceType })
  return { manager, olFeature, store, selection }
}

test('getState returns the live state object', () => {
  const { selection } = setup()
  expect(selection.getState()).toBe(selection.state)
})

test('defaults to mouse interface when none is given, and is always selected at index 0', () => {
  const { selection } = setup()
  expect(selection.state.interfaceType).toBe('mouse')
  expect(selection.state.selectedVertexIndex).toBe(0)
  expect(selection.state.selectedVertexType).toBe('vertex')
  expect(setup('touch').selection.state.interfaceType).toBe('touch')
})

test('claims the D-pad exactly once at construction, never VERTEX_CHANGE', () => {
  const { manager } = setup()
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, { index: 0, numVertices: 1 })
  expect(manager.emit).not.toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_CHANGE, expect.anything())
})

test('populates the initial coordinate at construction', () => {
  const { selection } = setup()
  expect(selection.state.vertices).toEqual([[5, 5]])
})

test('a selectedVertexIndex/Type write is silently dropped — the point stays always-selected', () => {
  const { selection, manager } = setup()
  manager.emit.mockClear()
  selection.setState({ selectedVertexIndex: -1, selectedVertexType: null })
  expect(selection.state.selectedVertexIndex).toBe(0)
  expect(selection.state.selectedVertexType).toBe('vertex')
  expect(manager.emit).not.toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, expect.anything())
})

test('other setState updates apply normally, without firing onUpdate unless vertices changes', () => {
  const { selection } = setup()
  const onUpdate = jest.fn()
  selection.setHooks({ onUpdate })
  selection.setState({ interfaceType: 'keyboard' })
  expect(selection.state.interfaceType).toBe('keyboard')
  expect(onUpdate).not.toHaveBeenCalled()
})

test('a vertices update fires the onUpdate hook', () => {
  const { selection } = setup()
  const onUpdate = jest.fn()
  selection.setHooks({ onUpdate })
  selection.setState({ vertices: [[9, 9]] })
  expect(onUpdate).toHaveBeenCalled()
})

test('syncGeom derives the coordinate from the geometry and emits UPDATE only (never VERTEX_CHANGE)', () => {
  const { selection, manager, store, olFeature } = setup()
  manager.emit.mockClear()
  olFeature.getGeometry().setCoordinates([7, 8])
  selection.syncGeom()
  expect(selection.state.vertices).toEqual([[7, 8]])
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.UPDATE, store.toGeoJSON())
  expect(manager.emit).not.toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_CHANGE, expect.anything())
})

test('emitGeometryValidation emits a deferred commit-level geometrychange with the change phase', () => {
  jest.useFakeTimers()
  const { selection, manager, store } = setup()
  manager.emit.mockClear()

  selection.emitGeometryValidation('commit-move', 0)
  expect(manager.emit).not.toHaveBeenCalledWith(ADAPTER_EVENTS.GEOMETRY_CHANGE, expect.anything())

  jest.runAllTimers()
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.GEOMETRY_CHANGE, {
    feature: store.toGeoJSON(),
    phase: 'commit-move',
    vertexIndex: 0
  })
  jest.useRealTimers()
})

test('emitGeometryValidation is a no-op without a change phase', () => {
  jest.useFakeTimers()
  const { selection, manager } = setup()
  manager.emit.mockClear()
  selection.emitGeometryValidation(undefined, 0)
  jest.runAllTimers()
  expect(manager.emit).not.toHaveBeenCalledWith(ADAPTER_EVENTS.GEOMETRY_CHANGE, expect.anything())
  jest.useRealTimers()
})

test('geometry changes refresh the cached coordinate until destroy unbinds the listener', () => {
  const { selection, olFeature } = setup()
  olFeature.getGeometry().setCoordinates([20, 20])
  expect(selection.state.vertices).toEqual([[20, 20]])
  selection.destroy()
  olFeature.getGeometry().setCoordinates([30, 30])
  expect(selection.state.vertices).toEqual([[20, 20]])
})
