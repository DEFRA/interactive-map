import Style from 'ol/style/Style.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import {
  registerCrispCanvasPattern,
  registerCrispCanvasPatterns,
  getCachedCrispPatternFill,
  clearCrispPatternCache,
  buildCanvasPatternStyle
} from './canvasPatternStyle.js'

const OUTDOOR = 'outdoor'

const makePatternRegistry = () => ({
  getPatternImageId: jest.fn((style, mapStyleId, pixelRatio) => `pattern-${style.fillPattern}-${mapStyleId}-${pixelRatio}`),
  rasterisePatternImage: jest.fn(async (style, mapStyleId, pixelRatio) => ({
    imageId: `pattern-${style.fillPattern}-${mapStyleId}-${pixelRatio}`,
    imageData: { width: 16 * pixelRatio, height: 16 * pixelRatio }
  }))
})

let createPatternCalls
beforeEach(() => {
  clearCrispPatternCache()
  createPatternCalls = []
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    this._ctx ??= {
      putImageData: jest.fn(),
      createPattern: jest.fn((source, repetition) => {
        const pattern = { source, repetition }
        createPatternCalls.push(pattern)
        return pattern
      })
    }
    return this._ctx
  })
})

describe('registerCrispCanvasPattern', () => {
  it('caches a Fill built from a real CanvasPattern for a valid pattern config', async () => {
    const patternRegistry = makePatternRegistry()
    const style = { fillPattern: 'dot' }
    await registerCrispCanvasPattern(style, OUTDOOR, patternRegistry, 2)
    const imageId = patternRegistry.getPatternImageId(style, OUTDOOR, 2)
    const fill = getCachedCrispPatternFill(imageId)
    expect(fill.getColor()).toEqual(expect.objectContaining({ repetition: 'repeat' }))
  })

  it('rasterises at the given pixelRatio, not a fixed constant', async () => {
    const patternRegistry = makePatternRegistry()
    await registerCrispCanvasPattern({ fillPattern: 'dot' }, OUTDOOR, patternRegistry, 3)
    expect(patternRegistry.rasterisePatternImage).toHaveBeenCalledWith({ fillPattern: 'dot' }, OUTDOOR, 3)
  })

  it('does nothing when getPatternImageId returns null', async () => {
    const patternRegistry = makePatternRegistry()
    patternRegistry.getPatternImageId.mockReturnValue(null)
    await registerCrispCanvasPattern({ fillPattern: 'unknown' }, OUTDOOR, patternRegistry, 1)
    expect(patternRegistry.rasterisePatternImage).not.toHaveBeenCalled()
  })

  it('does nothing when rasterisePatternImage returns null', async () => {
    const patternRegistry = makePatternRegistry()
    patternRegistry.rasterisePatternImage.mockResolvedValue(null)
    const style = { fillPattern: 'dot' }
    await registerCrispCanvasPattern(style, OUTDOOR, patternRegistry, 1)
    const imageId = patternRegistry.getPatternImageId(style, OUTDOOR, 1)
    expect(getCachedCrispPatternFill(imageId)).toBeUndefined()
  })

  it('skips rasterising again once cached for the same imageId', async () => {
    const patternRegistry = makePatternRegistry()
    const style = { fillPattern: 'dot' }
    await registerCrispCanvasPattern(style, OUTDOOR, patternRegistry, 1)
    await registerCrispCanvasPattern(style, OUTDOOR, patternRegistry, 1)
    expect(patternRegistry.rasterisePatternImage).toHaveBeenCalledTimes(1)
  })

  it('building the same pattern config twice concurrently still leaves exactly one cached Fill', async () => {
    // registerCrispCanvasPatterns (plural) can be handed two different dataset styles that
    // happen to resolve to the same imageId (identical pattern/colours) — both start rasterising
    // before either has cached its result, so the second one back must skip re-caching rather
    // than clobbering the first.
    const patternRegistry = makePatternRegistry()
    const style = { fillPattern: 'dot' }
    await registerCrispCanvasPatterns([style, { ...style }], OUTDOOR, patternRegistry, 1)
    const imageId = patternRegistry.getPatternImageId(style, OUTDOOR, 1)
    expect(getCachedCrispPatternFill(imageId)).toBeDefined()
  })

  it('caches separately per pixelRatio, since imageId is pixelRatio-scoped', async () => {
    const patternRegistry = makePatternRegistry()
    const style = { fillPattern: 'dot' }
    await registerCrispCanvasPattern(style, OUTDOOR, patternRegistry, 1)
    await registerCrispCanvasPattern(style, OUTDOOR, patternRegistry, 4)
    expect(patternRegistry.rasterisePatternImage).toHaveBeenCalledTimes(2)
    expect(getCachedCrispPatternFill(patternRegistry.getPatternImageId(style, OUTDOOR, 1))).toBeDefined()
    expect(getCachedCrispPatternFill(patternRegistry.getPatternImageId(style, OUTDOOR, 4))).toBeDefined()
  })
})

describe('registerCrispCanvasPatterns', () => {
  it('registers every config in parallel', async () => {
    const patternRegistry = makePatternRegistry()
    await registerCrispCanvasPatterns([{ fillPattern: 'dot' }, { fillPattern: 'stripes' }], OUTDOOR, patternRegistry, 1)
    expect(patternRegistry.rasterisePatternImage).toHaveBeenCalledTimes(2)
  })

  it('is a no-op for an empty array', async () => {
    const patternRegistry = makePatternRegistry()
    await registerCrispCanvasPatterns([], OUTDOOR, patternRegistry, 1)
    expect(patternRegistry.rasterisePatternImage).not.toHaveBeenCalled()
  })
})

describe('buildCanvasPatternStyle', () => {
  const feature = (props) => new Feature({ geometry: new Point([0, 0]), ...props })

  it('returns undefined when the pattern has not been registered yet', () => {
    const patternRegistry = makePatternRegistry()
    const registryDataset = { style: { fillPattern: 'dot' }, filter: null }
    const styleFn = buildCanvasPatternStyle(registryDataset, OUTDOOR, 1, patternRegistry)
    expect(styleFn(feature())).toBeUndefined()
  })

  it('returns a Style with the cached pattern Fill once registered, for an unfiltered dataset', async () => {
    const patternRegistry = makePatternRegistry()
    await registerCrispCanvasPattern({ fillPattern: 'dot' }, OUTDOOR, patternRegistry, 1)
    const registryDataset = { style: { fillPattern: 'dot' }, filter: null, hasStroke: false }
    const styleFn = buildCanvasPatternStyle(registryDataset, OUTDOOR, 1, patternRegistry)
    const style = styleFn(feature())
    expect(style).toBeInstanceOf(Style)
    expect(style.getFill().getColor()).toEqual(expect.objectContaining({ repetition: 'repeat' }))
  })

  it('includes a Stroke when the dataset has one', async () => {
    const patternRegistry = makePatternRegistry()
    await registerCrispCanvasPattern({ fillPattern: 'dot' }, OUTDOOR, patternRegistry, 1)
    const registryDataset = {
      style: { fillPattern: 'dot', stroke: '#ff0000', strokeWidth: 3 },
      filter: null,
      hasStroke: true
    }
    const styleFn = buildCanvasPatternStyle(registryDataset, OUTDOOR, 1, patternRegistry)
    const style = styleFn(feature())
    expect(style.getStroke().getColor()).toBe('#ff0000')
    expect(style.getStroke().getWidth()).toBe(3)
  })

  it('defaults the Stroke width to 1 when strokeWidth is not set', async () => {
    const patternRegistry = makePatternRegistry()
    await registerCrispCanvasPattern({ fillPattern: 'dot' }, OUTDOOR, patternRegistry, 1)
    const registryDataset = {
      style: { fillPattern: 'dot', stroke: '#ff0000' },
      filter: null,
      hasStroke: true
    }
    const styleFn = buildCanvasPatternStyle(registryDataset, OUTDOOR, 1, patternRegistry)
    expect(styleFn(feature()).getStroke().getWidth()).toBe(1)
  })

  it('evaluates a filter correctly for a feature with no geometry', async () => {
    const patternRegistry = makePatternRegistry()
    await registerCrispCanvasPattern({ fillPattern: 'dot' }, OUTDOOR, patternRegistry, 1)
    const registryDataset = {
      style: { fillPattern: 'dot' },
      filter: ['==', ['get', 'category'], 'a'],
      hasStroke: false
    }
    const styleFn = buildCanvasPatternStyle(registryDataset, OUTDOOR, 1, patternRegistry)
    const featureWithNoGeometry = new Feature({ category: 'a' })
    expect(styleFn(featureWithNoGeometry)).toBeInstanceOf(Style)
  })

  it('hides a feature that does not match the dataset filter', async () => {
    const patternRegistry = makePatternRegistry()
    await registerCrispCanvasPattern({ fillPattern: 'dot' }, OUTDOOR, patternRegistry, 1)
    const registryDataset = {
      style: { fillPattern: 'dot' },
      filter: ['==', ['get', 'category'], 'a'],
      hasStroke: false
    }
    const styleFn = buildCanvasPatternStyle(registryDataset, OUTDOOR, 1, patternRegistry)
    expect(styleFn(feature({ category: 'b' }))).toBeUndefined()
  })

  it('shows a feature that matches the dataset filter', async () => {
    const patternRegistry = makePatternRegistry()
    await registerCrispCanvasPattern({ fillPattern: 'dot' }, OUTDOOR, patternRegistry, 1)
    const registryDataset = {
      style: { fillPattern: 'dot' },
      filter: ['==', ['get', 'category'], 'a'],
      hasStroke: false
    }
    const styleFn = buildCanvasPatternStyle(registryDataset, OUTDOOR, 1, patternRegistry)
    expect(styleFn(feature({ category: 'a' }))).toBeInstanceOf(Style)
  })
})
