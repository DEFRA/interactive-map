import { ANCHOR_ID, isDrawOwnedLayerId, ensureAnchorLayer, applyLayerOrder } from './layerOrder.js'

const fakeMap = () => {
  const sources = new Set()
  const layers = []
  return {
    addSource: jest.fn((id) => sources.add(id)),
    getSource: jest.fn((id) => sources.has(id) ? {} : undefined),
    addLayer: jest.fn((layer) => layers.push(layer.id)),
    getLayer: jest.fn((id) => layers.includes(id) ? {} : undefined),
    moveLayer: jest.fn((id, beforeId) => {
      layers.splice(layers.indexOf(id), 1)
      layers.splice(layers.indexOf(beforeId), 0, id)
    }),
    _layers: layers
  }
}

describe('isDrawOwnedLayerId', () => {
  test('recognises the anchor and any draw-prefixed layer', () => {
    expect(isDrawOwnedLayerId(ANCHOR_ID)).toBe(true)
    expect(isDrawOwnedLayerId('draw-abc-fill')).toBe(true)
    expect(isDrawOwnedLayerId('some-dataset-layer')).toBe(false)
  })
})

describe('ensureAnchorLayer', () => {
  test('creates the source and layer once', () => {
    const map = fakeMap()
    ensureAnchorLayer(map)
    expect(map.addSource).toHaveBeenCalledWith(ANCHOR_ID, expect.objectContaining({ type: 'geojson' }))
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: ANCHOR_ID, layout: { visibility: 'none' } }))
  })

  test('is idempotent — a second call adds nothing further', () => {
    const map = fakeMap()
    ensureAnchorLayer(map)
    ensureAnchorLayer(map)
    expect(map.addLayer).toHaveBeenCalledTimes(1)
  })

  test('re-adds only the layer when the source already exists', () => {
    const map = fakeMap()
    map.addSource(ANCHOR_ID)
    ensureAnchorLayer(map)
    expect(map.addSource).toHaveBeenCalledTimes(1)
    expect(map.addLayer).toHaveBeenCalledTimes(1)
  })
})

describe('applyLayerOrder', () => {
  test('chains every feature in order, topmost first, directly off the anchor', () => {
    const map = fakeMap()
    // Pre-register layer ids as if featureLayerGroup.js had already created them.
    ;['draw-a-symbol', 'draw-b-line', 'draw-b-fill', 'draw-c-symbol'].forEach((id) => map._layers.push(id))
    const geometryTypeForId = (id) => ({ a: 'Point', b: 'Polygon', c: 'Point' })[id]
    applyLayerOrder(map, ['a', 'b', 'c'], geometryTypeForId) // c is frontmost (last = topmost)

    const order = map._layers
    // Topmost to bottommost: anchor, then c, then b's pair (line above fill), then a.
    expect(order.indexOf(ANCHOR_ID)).toBeGreaterThan(order.indexOf('draw-c-symbol'))
    expect(order.indexOf('draw-c-symbol')).toBeGreaterThan(order.indexOf('draw-b-line'))
    expect(order.indexOf('draw-b-line')).toBeGreaterThan(order.indexOf('draw-b-fill'))
    expect(order.indexOf('draw-b-fill')).toBeGreaterThan(order.indexOf('draw-a-symbol'))
  })

  test('a feature pair can never end up separated, even across a full resync', () => {
    const map = fakeMap()
    ;['draw-a-line', 'draw-a-fill', 'draw-b-symbol'].forEach((id) => map._layers.push(id))
    const geometryTypeForId = (id) => ({ a: 'Polygon', b: 'Point' })[id]
    applyLayerOrder(map, ['a', 'b'], geometryTypeForId)
    const order = map._layers
    const lineIndex = order.indexOf('draw-a-line')
    const fillIndex = order.indexOf('draw-a-fill')
    expect(Math.abs(lineIndex - fillIndex)).toBe(1)
  })

  test('skips a layer id that does not currently exist', () => {
    const map = fakeMap()
    map._layers.push('draw-a-symbol')
    const geometryTypeForId = () => 'Point'
    expect(() => applyLayerOrder(map, ['missing', 'a'], geometryTypeForId)).not.toThrow()
  })

  test('creates the anchor if it is missing (e.g. after a style reload)', () => {
    const map = fakeMap()
    applyLayerOrder(map, [], () => 'Point')
    expect(map.getLayer(ANCHOR_ID)).toBeTruthy()
  })
})
