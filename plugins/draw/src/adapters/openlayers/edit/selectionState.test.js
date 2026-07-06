import { createSelectionState } from './selectionState.js'
import { createFakeManager, polygonFeature } from '../__helpers__/harness.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'

const RING = [[0, 0], [10, 0], [10, 10], [0, 0]]

const setup = (interfaceType) => {
  const manager = createFakeManager()
  const olFeature = polygonFeature(RING)
  const layers = {
    vertexLayer: { update: jest.fn(), setSelected: jest.fn() },
    midpointLayer: { update: jest.fn(), setSelected: jest.fn(), getCoords: jest.fn(() => [[5, 0], [10, 5], [5, 5]]) },
    activeLayer: { update: jest.fn() }
  }
  const map = { render: jest.fn() }
  const store = { toGeoJSON: jest.fn(() => ({ id: 'f1' })) }
  const selection = createSelectionState({ map, manager, store, olFeature, interfaceType, layers })
  return { manager, olFeature, layers, map, store, selection }
}

test('defaults to mouse interface when none is given', () => {
  expect(setup().selection.state.interfaceType).toBe('mouse')
  expect(setup('touch').selection.state.interfaceType).toBe('touch')
})

test('selecting a vertex highlights it, clears midpoint selection and reports the selection', () => {
  const { selection, layers, manager } = setup()
  selection.state.vertices = [[0, 0], [10, 0], [10, 10]]
  selection.setState({ selectedVertexIndex: 1, selectedVertexType: 'vertex' })
  expect(layers.vertexLayer.setSelected).toHaveBeenCalledWith(1)
  expect(layers.midpointLayer.setSelected).toHaveBeenCalledWith(-1)
  expect(layers.activeLayer.update).toHaveBeenCalledWith(selection.state)
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, { index: 1, numVertices: 3 })
})

test('selecting a midpoint highlights it by local index and reports index -1', () => {
  const { selection, layers, manager } = setup()
  selection.state.vertices = [[0, 0], [10, 0], [10, 10]]
  selection.setState({ selectedVertexIndex: 4, selectedVertexType: 'midpoint' })
  expect(layers.midpointLayer.setSelected).toHaveBeenCalledWith(1)
  expect(layers.vertexLayer.setSelected).toHaveBeenCalledWith(-1)
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, { index: -1, numVertices: 3 })
})

test('deselecting fires the onDeselect hook', () => {
  const { selection } = setup()
  const onDeselect = jest.fn()
  selection.setHooks({ onDeselect })
  selection.setState({ selectedVertexIndex: -1, selectedVertexType: null })
  expect(onDeselect).toHaveBeenCalled()
})

test('a vertices update refreshes the handle layers, midpoints and the map', () => {
  const { selection, layers, map } = setup()
  const onUpdate = jest.fn()
  selection.setHooks({ onUpdate })
  selection.setState({ vertices: [[0, 0], [10, 0], [10, 10]] })
  expect(layers.vertexLayer.update).toHaveBeenCalledWith({ type: 'Polygon', coordinates: [RING] })
  expect(selection.state.midpoints).toEqual([[5, 0], [10, 5], [5, 5]])
  expect(onUpdate).toHaveBeenCalled()
  expect(map.render).toHaveBeenCalled()
})

test('syncGeom derives state from the geometry and emits vertexchange + update', () => {
  const { selection, manager, store } = setup()
  selection.syncGeom()
  expect(selection.state.vertices).toEqual([[0, 0], [10, 0], [10, 10]])
  expect(selection.state.midpoints).toHaveLength(3)
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_CHANGE, { numVertices: 3 })
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.UPDATE, store.toGeoJSON())
})

test('geometry changes refresh the layers until destroy unbinds the listener', () => {
  const { selection, olFeature, layers } = setup()
  olFeature.getGeometry().setCoordinates([[[0, 0], [20, 0], [20, 20], [0, 0]]])
  expect(selection.state.vertices).toEqual([[0, 0], [20, 0], [20, 20]])
  const calls = layers.vertexLayer.update.mock.calls.length
  selection.destroy()
  olFeature.getGeometry().setCoordinates([[[0, 0], [30, 0], [30, 30], [0, 0]]])
  expect(layers.vertexLayer.update.mock.calls.length).toBe(calls)
})
