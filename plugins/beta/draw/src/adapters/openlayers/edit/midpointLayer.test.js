import Style from 'ol/style/Style.js'
import { createMidpointLayer } from './midpointLayer.js'
import { createFakeMap } from '../__helpers__/harness.js'

const GEOM = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] }

const setup = () => {
  const map = createFakeMap()
  const style = new Style({})
  const handles = createMidpointLayer(map, style)
  const layer = map.layers[0]
  return { map, style, handles, layer, source: layer.getSource() }
}

test('update renders one handle per segment midpoint, retrievable in index order', () => {
  const { handles, source } = setup()
  handles.update(GEOM)
  expect(source.getFeatures()).toHaveLength(3)
  expect(handles.getCoords()).toEqual([[5, 0], [10, 5], [5, 5]])
})

test('the selected midpoint is hidden here and styles hot-swap', () => {
  const { handles, layer, style, source } = setup()
  handles.update(GEOM)
  handles.setSelected(0)
  const styleFn = layer.getStyle()
  const featureAt = (i) => source.getFeatures().find(f => f.get('midpointIndex') === i)
  expect(styleFn(featureAt(0))).toBeNull()
  expect(styleFn(featureAt(1))).toEqual([style])

  const newStyle = new Style({})
  handles.updateStyle(newStyle)
  expect(styleFn(featureAt(1))).toEqual([newStyle])
})

test('remove clears and detaches the layer', () => {
  const { map, handles, source } = setup()
  handles.update(GEOM)
  handles.remove()
  expect(source.getFeatures()).toHaveLength(0)
  expect(map.layers).toHaveLength(0)
})
