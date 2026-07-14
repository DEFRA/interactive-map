import { addFillLayer, addStrokeLayer, addSymbolLayer } from './layerBuilders.js'

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeMap = () => {
  const layers = new Map()
  return {
    getLayer: jest.fn(id => layers.get(id) ?? null),
    getSource: jest.fn(() => null),
    addLayer: jest.fn(spec => layers.set(spec.id, spec)),
    addSource: jest.fn()
  }
}

const makeDataset = (overrides = {}) => ({
  id: 'test-ds',
  hasFill: false,
  fillLayerId: null,
  hasStroke: false,
  strokeLayerId: null,
  hasSymbol: false,
  symbolLayerId: null,
  style: {},
  opacity: 1,
  getFillSource: jest.fn(paint => ({ id: 'test-ds', type: 'fill', paint })),
  getStrokeSource: jest.fn(paint => ({ id: 'test-ds-stroke', type: 'line', paint })),
  getSymbolSource: jest.fn((imageId, anchor) => ({ id: 'test-ds', type: 'symbol', layout: { 'icon-image': imageId } })),
  ...overrides
})

// ─── addFillLayer ─────────────────────────────────────────────────────────────

describe('addFillLayer', () => {
  it('uses pixelRatio = 1 when the argument is omitted', () => {
    const map = makeMap()
    const patternRegistry = { getPatternImageId: jest.fn(() => null) }
    const ds = makeDataset({ hasFill: true, fillLayerId: 'test-ds', style: { fill: '#ff0000' } })
    addFillLayer(map, ds, 'outdoor', patternRegistry) // no pixelRatio argument
    expect(patternRegistry.getPatternImageId).toHaveBeenCalledWith(ds.style, 'outdoor', 1)
  })
})

// ─── addStrokeLayer ───────────────────────────────────────────────────────────

describe('addStrokeLayer', () => {
  it('defaults line-width to 1 when strokeWidth is not set on the style', () => {
    const map = makeMap()
    const ds = makeDataset({ hasStroke: true, strokeLayerId: 'test-ds-stroke', style: { stroke: '#000000' } })
    addStrokeLayer(map, ds, 'outdoor')
    expect(ds.getStrokeSource).toHaveBeenCalledWith(expect.objectContaining({ 'line-width': 1 }))
  })

  it('includes line-dasharray in the paint when strokeDashArray is set', () => {
    const map = makeMap()
    const ds = makeDataset({
      hasStroke: true,
      strokeLayerId: 'test-ds-stroke',
      style: { stroke: '#000000', strokeWidth: 2, strokeDashArray: [4, 2] }
    })
    addStrokeLayer(map, ds, 'outdoor')
    expect(ds.getStrokeSource).toHaveBeenCalledWith(expect.objectContaining({ 'line-dasharray': [4, 2] }))
  })
})

// ─── addSymbolLayer ───────────────────────────────────────────────────────────

describe('addSymbolLayer', () => {
  it('returns early without adding a layer when symbolDef is null', () => {
    const map = makeMap()
    const symbolRegistry = { getSymbolDef: jest.fn(() => null), getSymbolImageId: jest.fn() }
    const ds = makeDataset({ hasSymbol: true, symbolLayerId: 'test-ds', style: {} })
    addSymbolLayer(map, ds, { id: 'outdoor' }, symbolRegistry, 1)
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('returns early without adding a layer when imageId is null', () => {
    const map = makeMap()
    const symbolRegistry = { getSymbolDef: jest.fn(() => ({})), getSymbolImageId: jest.fn(() => null) }
    const ds = makeDataset({ hasSymbol: true, symbolLayerId: 'test-ds', style: {} })
    addSymbolLayer(map, ds, { id: 'outdoor' }, symbolRegistry, 1)
    expect(map.addLayer).not.toHaveBeenCalled()
  })
})
