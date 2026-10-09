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
  getSymbolSource: jest.fn((imageId, iconLayout) => ({ id: 'test-ds', type: 'symbol', layout: { 'icon-image': imageId, ...iconLayout } })),
  ...overrides
})

const ICON_LAYOUT = { 'icon-anchor': 'bottom', 'icon-offset': [0, 4.7] }

const makeMapProvider = (map) => ({ map, getSymbolIconLayout: jest.fn(() => ICON_LAYOUT) })

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
  it("uses the style's strokeWidth for line-width", () => {
    const map = makeMap()
    const ds = makeDataset({ hasStroke: true, strokeLayerId: 'test-ds-stroke', style: { stroke: '#000000', strokeWidth: 3 } })
    addStrokeLayer(map, ds, 'outdoor')
    expect(ds.getStrokeSource).toHaveBeenCalledWith(expect.objectContaining({ 'line-width': 3 }))
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
    addSymbolLayer(makeMapProvider(map), ds, { id: 'outdoor' }, symbolRegistry, 1)
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('returns early without adding a layer when imageId is null', () => {
    const map = makeMap()
    const symbolRegistry = { getSymbolDef: jest.fn(() => ({})), getSymbolImageId: jest.fn(() => null) }
    const ds = makeDataset({ hasSymbol: true, symbolLayerId: 'test-ds', style: {} })
    addSymbolLayer(makeMapProvider(map), ds, { id: 'outdoor' }, symbolRegistry, 1)
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('places the icon with the provider\'s icon layout for the sized symbol', () => {
    const map = makeMap()
    const mapProvider = makeMapProvider(map)
    const symbolDef = { viewBox: '0 0 44 47', anchor: [0.5, 0.9] }
    const symbolRegistry = { getSymbolDef: jest.fn(() => symbolDef), getSymbolImageId: jest.fn(() => 'img') }
    const ds = makeDataset({ hasSymbol: true, symbolLayerId: 'test-ds', style: { symbol: 'pin' } })
    addSymbolLayer(mapProvider, ds, { id: 'outdoor' }, symbolRegistry, 1)
    expect(mapProvider.getSymbolIconLayout).toHaveBeenCalledWith(symbolDef)
    expect(ds.getSymbolSource).toHaveBeenCalledWith('img', ICON_LAYOUT)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ layout: { 'icon-image': 'img', ...ICON_LAYOUT } }))
  })
})
