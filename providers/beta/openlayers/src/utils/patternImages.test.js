import Fill from 'ol/style/Fill.js'
import { PatternImageCache } from './patternImages.js'

const OUTDOOR = 'outdoor'

const imageIdFor = (style, pixelRatio) => `pattern-${style.fillPattern}-${pixelRatio}x`

const makePatternRegistry = () => ({
  getPatternImageId: jest.fn((style, mapStyleId, pixelRatio) => (style.fillPattern ? imageIdFor(style, pixelRatio) : null)),
  rasterisePatternImage: jest.fn(async (style, mapStyleId, pixelRatio) => ({
    imageId: imageIdFor(style, pixelRatio),
    imageData: { width: 16 * pixelRatio, height: 16 * pixelRatio }
  }))
})

let cache
let createPatternCalls

beforeEach(() => {
  cache = new PatternImageCache()
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

describe('PatternImageCache', () => {
  it('caches a Fill built from a repeating CanvasPattern of the rasterised image', async () => {
    await cache.registerPatterns([{ fillPattern: 'dot' }], OUTDOOR, makePatternRegistry(), 2)
    const fill = cache.getFill('pattern-dot-2x')
    expect(fill).toBeInstanceOf(Fill)
    const [pattern] = createPatternCalls
    expect(pattern.repetition).toBe('repeat')
    expect([pattern.source.width, pattern.source.height]).toEqual([32, 32])
    expect(fill.getColor()).toBe(pattern)
  })

  it('returns undefined for a pattern that has not been registered', () => {
    expect(cache.getFill('pattern-unseen')).toBeUndefined()
  })

  it('skips styles with no pattern and patterns that do not rasterise', async () => {
    const patternRegistry = makePatternRegistry()
    patternRegistry.rasterisePatternImage.mockResolvedValueOnce(null)
    await cache.registerPatterns([{ fillColor: 'red' }, { fillPattern: 'missing' }], OUTDOOR, patternRegistry, 1)
    expect(cache.fills.size).toBe(0)
  })

  it('rasterises a pattern shared by several styles once, and reuses a cached fill', async () => {
    const patternRegistry = makePatternRegistry()
    await cache.registerPatterns([{ fillPattern: 'dot' }, { fillPattern: 'dot' }], OUTDOOR, patternRegistry, 1)
    await cache.registerPatterns([{ fillPattern: 'dot' }], OUTDOOR, patternRegistry, 1)
    expect(patternRegistry.rasterisePatternImage).toHaveBeenCalledTimes(1)
  })

  it('keeps the current and previous size, and drops an older one\'s fill when a third arrives', async () => {
    const patternRegistry = makePatternRegistry()
    const style = { fillPattern: 'dot' }
    await cache.registerPatterns([style], OUTDOOR, patternRegistry, 1)
    await cache.registerPatterns([style], OUTDOOR, patternRegistry, 2)
    expect(cache.getFill('pattern-dot-1x')).toBeDefined()
    await cache.registerPatterns([style], OUTDOOR, patternRegistry, 3)
    expect(cache.getFill('pattern-dot-1x')).toBeUndefined()
    expect(cache.fills.size).toBe(2)
  })
})
