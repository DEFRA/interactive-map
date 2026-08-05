import Style from 'ol/style/Style.js'
import { createVertexLayer } from './vertexLayer.js'
import { createFakeMap } from '../__helpers__/harness.js'

const GEOM = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] }

const setup = () => {
  const map = createFakeMap()
  const style = new Style({})
  const handles = createVertexLayer(map, style)
  const layer = map.layers[0]
  return { map, style, handles, layer, source: layer.getSource() }
}

test('update renders one handle per editable vertex, indexed', () => {
  const { handles, source } = setup()
  handles.update(GEOM)
  expect(source.getFeatures()).toHaveLength(3)
  expect(source.getFeatures().map(f => f.get('vertexIndex')).sort()).toEqual([0, 1, 2])
})

test('the selected vertex is hidden here (the active layer draws it) and styles hot-swap', () => {
  const { handles, layer, style, source } = setup()
  handles.update(GEOM)
  handles.setSelected(1)
  const styleFn = layer.getStyle()
  const featureAt = (i) => source.getFeatures().find(f => f.get('vertexIndex') === i)
  expect(styleFn(featureAt(1))).toBeNull()
  expect(styleFn(featureAt(0))).toEqual([style])

  const newStyle = new Style({})
  handles.updateStyle(newStyle)
  expect(styleFn(featureAt(0))).toEqual([newStyle])
})

test('remove clears and detaches the layer', () => {
  const { map, handles, source } = setup()
  handles.update(GEOM)
  handles.remove()
  expect(source.getFeatures()).toHaveLength(0)
  expect(map.layers).toHaveLength(0)
})
