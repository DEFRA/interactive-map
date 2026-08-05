import { createActiveVertexLayer } from './activeVertexLayer.js'
import { createFakeMap, createFakeManager } from '../__helpers__/harness.js'

const setup = () => {
  const map = createFakeMap()
  const manager = createFakeManager()
  const activeLayer = createActiveVertexLayer(map, () => manager.styles)
  const source = map.layers[0].getSource()
  const stateWith = (overrides) => ({
    selectedVertexIndex: -1,
    selectedVertexType: null,
    vertices: [[0, 0], [10, 0], [10, 10]],
    midpoints: [[5, 0], [10, 5], [5, 5]],
    ...overrides
  })
  return { map, manager, activeLayer, source, stateWith }
}

test('renders the selected vertex with the selected-vertex style', () => {
  const { activeLayer, source, manager, stateWith } = setup()
  activeLayer.update(stateWith({ selectedVertexIndex: 1, selectedVertexType: 'vertex' }))
  const features = source.getFeatures()
  expect(features).toHaveLength(1)
  expect(features[0].getGeometry().getCoordinates()).toEqual([10, 0])
  expect(features[0].getStyle()).toBe(manager.styles.selectedVertexStyle)
})

test('renders a selected midpoint by its local index with the midpoint style', () => {
  const { activeLayer, source, manager, stateWith } = setup()
  activeLayer.update(stateWith({ selectedVertexIndex: 4, selectedVertexType: 'midpoint' }))
  const features = source.getFeatures()
  expect(features[0].getGeometry().getCoordinates()).toEqual([10, 5])
  expect(features[0].getStyle()).toBe(manager.styles.selectedMidpointStyle)
})

test('renders nothing without a selection, for an unknown type, or for a missing coordinate', () => {
  const { activeLayer, source, stateWith } = setup()
  activeLayer.update(stateWith({ selectedVertexIndex: 1, selectedVertexType: 'vertex' }))
  activeLayer.update(stateWith({}))
  expect(source.getFeatures()).toHaveLength(0)
  activeLayer.update(stateWith({ selectedVertexIndex: 0, selectedVertexType: 'segment' }))
  expect(source.getFeatures()).toHaveLength(0)
  activeLayer.update(stateWith({ selectedVertexIndex: 99, selectedVertexType: 'vertex' }))
  expect(source.getFeatures()).toHaveLength(0)
})

test('remove clears the source and detaches the layer', () => {
  const { map, activeLayer, source, stateWith } = setup()
  activeLayer.update(stateWith({ selectedVertexIndex: 0, selectedVertexType: 'vertex' }))
  activeLayer.remove()
  expect(source.getFeatures()).toHaveLength(0)
  expect(map.removeLayer).toHaveBeenCalled()
})
