import { createSnapIndicator } from './snapIndicator.js'
import { createFakeMap } from '../__helpers__/harness.js'

const colors = { snapVertex: '#sv', snapEdge: '#se' }

const setup = () => {
  const map = createFakeMap()
  const indicator = createSnapIndicator(map, colors)
  const layer = map.layers[0]
  return { map, indicator, layer, source: layer.getSource() }
}

const renderedColor = (layer, feature) => {
  const ctx = { beginPath: jest.fn(), arc: jest.fn(), fill: jest.fn(), fillStyle: null }
  layer.getStyle()(feature).getRenderer()([5, 6], { context: ctx, pixelRatio: 2 })
  return { color: ctx.fillStyle, arc: ctx.arc.mock.calls[0] }
}

test('show places a single reused feature; repeated shows move it rather than duplicate', () => {
  const { indicator, source } = setup()
  indicator.show([10, 10], 'vertex')
  indicator.show([20, 20], 'edge')
  expect(source.getFeatures()).toHaveLength(1)
  expect(source.getFeatures()[0].getGeometry().getCoordinates()).toEqual([20, 20])
  expect(source.getFeatures()[0].get('snapType')).toBe('edge')
})

test('vertex and edge snaps render circles in their own colours, scaled by pixelRatio', () => {
  const { indicator, layer, source } = setup()
  indicator.show([10, 10], 'vertex')
  const feature = source.getFeatures()[0]
  expect(renderedColor(layer, feature)).toEqual({ color: colors.snapVertex, arc: [5, 6, 20, 0, Math.PI * 2] })

  feature.set('snapType', 'edge', true)
  expect(renderedColor(layer, feature).color).toBe(colors.snapEdge)

  feature.set('snapType', 'mystery', true)
  expect(layer.getStyle()(feature)).toBeNull()
})

test('hide clears the circle and is safe to call when nothing is showing', () => {
  const { indicator, source } = setup()
  indicator.hide() // nothing showing — no-op
  indicator.show([10, 10], 'vertex')
  indicator.hide()
  expect(source.getFeatures()).toHaveLength(0)
  indicator.show([1, 1], 'vertex') // can show again after hiding
  expect(source.getFeatures()).toHaveLength(1)
})

test('colour updates apply to subsequent renders, refreshing a visible circle', () => {
  const { indicator, layer, source } = setup()
  indicator.show([10, 10], 'vertex')
  indicator.updateColors({ snapVertex: '#new', snapEdge: '#se' })
  expect(renderedColor(layer, source.getFeatures()[0]).color).toBe('#new')
  indicator.updateColors(colors) // also fine while hidden
})

test('colour updates while hidden skip the redraw', () => {
  const { indicator, source } = setup()
  const changed = jest.spyOn(source, 'changed')
  indicator.updateColors({ snapVertex: '#x', snapEdge: '#y' }) // nothing showing yet
  expect(changed).not.toHaveBeenCalled()
})

test('remove clears the source and detaches the layer', () => {
  const { map, indicator, source } = setup()
  indicator.show([10, 10], 'vertex')
  indicator.remove()
  expect(source.getFeatures()).toHaveLength(0)
  expect(map.removeLayer).toHaveBeenCalled()
})
