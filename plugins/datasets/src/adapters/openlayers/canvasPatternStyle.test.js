import Style from 'ol/style/Style.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { buildCanvasPatternStyle } from './canvasPatternStyle.js'
import { buildFilterEvaluator } from '../../../../../providers/beta/openlayers/src/utils/filterEvaluator.js'
import { PatternImageCache } from '../../../../../providers/beta/openlayers/src/utils/patternImages.js'

const OUTDOOR = 'outdoor'

// Stands in for the OL provider's pattern fills
let patternImages

// The adapter's style context, with the OL provider's real filter compiler and pattern fills
const styleContext = (patternRegistry) => ({
  mapStyleId: OUTDOOR,
  pixelRatio: 1,
  patternRegistry,
  getPatternFill: (imageId) => patternImages.getFill(imageId),
  buildFilterEvaluator
})

const registerPattern = (style, patternRegistry) => patternImages.registerPatterns([style], OUTDOOR, patternRegistry, 1)

const makePatternRegistry = () => ({
  getPatternImageId: jest.fn((style, mapStyleId, pixelRatio) => `pattern-${style.fillPattern}-${mapStyleId}-${pixelRatio}`),
  rasterisePatternImage: jest.fn(async (style, mapStyleId, pixelRatio) => ({
    imageId: `pattern-${style.fillPattern}-${mapStyleId}-${pixelRatio}`,
    imageData: { width: 16 * pixelRatio, height: 16 * pixelRatio }
  }))
})

beforeEach(() => {
  patternImages = new PatternImageCache()
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    this._ctx ??= {
      putImageData: jest.fn(),
      createPattern: jest.fn((source, repetition) => ({ source, repetition }))
    }
    return this._ctx
  })
})

describe('buildCanvasPatternStyle', () => {
  const feature = (props) => new Feature({ geometry: new Point([0, 0]), ...props })

  it('returns undefined when the pattern has not been registered yet', () => {
    const patternRegistry = makePatternRegistry()
    const registryDataset = { style: { fillPattern: 'dot' }, filter: null }
    const styleFn = buildCanvasPatternStyle(registryDataset, styleContext(patternRegistry))
    expect(styleFn(feature())).toBeUndefined()
  })

  it('returns a Style with the cached pattern Fill once registered, for an unfiltered dataset', async () => {
    const patternRegistry = makePatternRegistry()
    await registerPattern({ fillPattern: 'dot' }, patternRegistry)
    const registryDataset = { style: { fillPattern: 'dot' }, filter: null, hasStroke: false }
    const styleFn = buildCanvasPatternStyle(registryDataset, styleContext(patternRegistry))
    const style = styleFn(feature())
    expect(style).toBeInstanceOf(Style)
    expect(style.getFill().getColor()).toEqual(expect.objectContaining({ repetition: 'repeat' }))
  })

  it('includes a Stroke when the dataset has one', async () => {
    const patternRegistry = makePatternRegistry()
    await registerPattern({ fillPattern: 'dot' }, patternRegistry)
    const registryDataset = {
      style: { fillPattern: 'dot', stroke: '#ff0000', strokeWidth: 3 },
      filter: null,
      hasStroke: true
    }
    const styleFn = buildCanvasPatternStyle(registryDataset, styleContext(patternRegistry))
    const style = styleFn(feature())
    expect(style.getStroke().getColor()).toBe('#ff0000')
    expect(style.getStroke().getWidth()).toBe(3)
  })

  it('evaluates a filter correctly for a feature with no geometry', async () => {
    const patternRegistry = makePatternRegistry()
    await registerPattern({ fillPattern: 'dot' }, patternRegistry)
    const registryDataset = {
      style: { fillPattern: 'dot' },
      filter: ['==', ['get', 'category'], 'a'],
      hasStroke: false
    }
    const styleFn = buildCanvasPatternStyle(registryDataset, styleContext(patternRegistry))
    const featureWithNoGeometry = new Feature({ category: 'a' })
    expect(styleFn(featureWithNoGeometry)).toBeInstanceOf(Style)
  })

  it('hides a feature that does not match the dataset filter', async () => {
    const patternRegistry = makePatternRegistry()
    await registerPattern({ fillPattern: 'dot' }, patternRegistry)
    const registryDataset = {
      style: { fillPattern: 'dot' },
      filter: ['==', ['get', 'category'], 'a'],
      hasStroke: false
    }
    const styleFn = buildCanvasPatternStyle(registryDataset, styleContext(patternRegistry))
    expect(styleFn(feature({ category: 'b' }))).toBeUndefined()
  })

  it('shows a feature that matches the dataset filter', async () => {
    const patternRegistry = makePatternRegistry()
    await registerPattern({ fillPattern: 'dot' }, patternRegistry)
    const registryDataset = {
      style: { fillPattern: 'dot' },
      filter: ['==', ['get', 'category'], 'a'],
      hasStroke: false
    }
    const styleFn = buildCanvasPatternStyle(registryDataset, styleContext(patternRegistry))
    expect(styleFn(feature({ category: 'a' }))).toBeInstanceOf(Style)
  })
})
