import { registerPatterns } from './patternImages.js'

const OUTDOOR = 'outdoor'

const SVG_CONTENT = '<path d="M0 0 L8 8"/>'

beforeAll(() => {
  globalThis.URL.createObjectURL = jest.fn(() => 'blob:mock')
  globalThis.URL.revokeObjectURL = jest.fn()

  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn((_x, _y, w, h) => ({ width: w, height: h }))
  }))

  globalThis.Image = class {
    constructor (w, h) {
      this.width = w
      this.height = h
      this._src = ''
    }

    get src () { return this._src }
    set src (val) { this._src = val; this.onload?.() }
  }
})

const makeMap = (existingIds = []) => ({
  hasImage: jest.fn((id) => existingIds.includes(id)),
  addImage: jest.fn()
})

const makePatternRegistry = (id = 'stripes', content = SVG_CONTENT) => ({
  get: jest.fn((name) => name === id ? { svgContent: content } : undefined)
})

// ─── registerPatterns ─────────────────────────────────────────────────────────

describe('registerPatterns — registration', () => {
  it('returns early and does not touch map for empty configs', async () => {
    const map = makeMap()
    const registry = makePatternRegistry()
    await registerPatterns(map, [], OUTDOOR, registry)
    expect(map.hasImage).not.toHaveBeenCalled()
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('calls addImage with pixelRatio 2 for a named pattern', async () => {
    const map = makeMap()
    const registry = makePatternRegistry()
    const config = { fillPattern: 'stripes' }
    await registerPatterns(map, [config], OUTDOOR, registry)
    expect(map.addImage).toHaveBeenCalledTimes(1)
    expect(map.addImage).toHaveBeenCalledWith(
      expect.stringMatching(/^pattern-[a-z0-9]+$/),
      expect.any(Object),
      { pixelRatio: 2 }
    )
  })

  it('calls addImage for an inline fillPatternSvgContent config', async () => {
    const map = makeMap()
    const registry = makePatternRegistry()
    const config = { fillPatternSvgContent: SVG_CONTENT }
    await registerPatterns(map, [config], OUTDOOR, registry)
    expect(map.addImage).toHaveBeenCalledTimes(1)
  })

  it('skips addImage when image is already registered', async () => {
    const registry = makePatternRegistry()
    const config = { fillPattern: 'stripes' }
    const { getPatternImageId } = await import('../../../../src/utils/patternUtils.js')
    const existingId = getPatternImageId(config, OUTDOOR, registry)
    const map = makeMap([existingId])
    await registerPatterns(map, [config], OUTDOOR, registry)
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('skips config when pattern has no inner content', async () => {
    const map = makeMap()
    const emptyRegistry = { get: jest.fn(() => undefined) }
    await registerPatterns(map, [{ fillPattern: 'unknown' }], OUTDOOR, emptyRegistry)
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('skips config when neither fillPattern nor fillPatternSvgContent is set', async () => {
    const map = makeMap()
    const registry = makePatternRegistry()
    await registerPatterns(map, [{ fillColor: '#ff0000' }], OUTDOOR, registry)
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('processes multiple configs in parallel', async () => {
    const map = makeMap()
    const registry = {
      get: jest.fn((name) => {
        if (name === 'stripes') { return { svgContent: '<path d="M0 0"/>' } }
        if (name === 'dots') { return { svgContent: '<circle cx="8" cy="8" r="4"/>' } }
        return undefined
      })
    }
    await registerPatterns(map, [{ fillPattern: 'stripes' }, { fillPattern: 'dots' }], OUTDOOR, registry)
    expect(map.addImage).toHaveBeenCalledTimes(2)
  })
})

describe('registerPatterns — color resolution and caching', () => {
  it('applies foreground and background colors when resolving the SVG', async () => {
    const map = makeMap()
    const registry = makePatternRegistry()
    const getContextSpy = HTMLCanvasElement.prototype.getContext
    await registerPatterns(
      map,
      [{ fillPattern: 'stripes', fillPatternForegroundColor: '#aabbcc', fillPatternBackgroundColor: '#112233' }],
      OUTDOOR,
      registry
    )
    expect(map.addImage).toHaveBeenCalledTimes(1)
    expect(getContextSpy).toHaveBeenCalled()
  })

  it('resolves style-keyed foreground color for the given mapStyleId', async () => {
    const map = makeMap()
    const registry = makePatternRegistry()
    const config = {
      fillPattern: 'stripes',
      fillPatternForegroundColor: { outdoor: '#aabbcc', dark: '#112233' }
    }
    await registerPatterns(map, [config], OUTDOOR, registry)
    const map2 = makeMap()
    await registerPatterns(map2, [config], 'dark', registry)
    const [idOutdoor] = map.addImage.mock.calls[0]
    const [idDark] = map2.addImage.mock.calls[0]
    expect(idOutdoor).not.toBe(idDark)
  })

  it('uses cached ImageData on second call with identical config', async () => {
    const map = makeMap()
    const registry = makePatternRegistry()
    const config = { fillPattern: 'stripes', fillPatternForegroundColor: '#unique1' }
    await registerPatterns(map, [config], OUTDOOR, registry)
    const { getPatternImageId } = await import('../../../../src/utils/patternUtils.js')
    const imageId = getPatternImageId(config, OUTDOOR, registry)
    const map2 = makeMap([imageId])
    await registerPatterns(map2, [config], OUTDOOR, registry)
    expect(map2.addImage).not.toHaveBeenCalled()
  })
})

describe('registerPatterns — null results', () => {
  it('does not call addImage when innerContent becomes unavailable inside rasterisePattern', async () => {
    // registry.get returns content on the first call (for getPatternImageId in registerPatterns)
    // but undefined on the second call (for getPatternInnerContent inside rasterisePattern)
    const registry = {
      get: jest.fn()
        .mockReturnValueOnce({ svgContent: SVG_CONTENT })
        .mockReturnValueOnce(undefined)
    }
    const map = makeMap()
    await registerPatterns(map, [{ fillPattern: 'stripes' }], OUTDOOR, registry)
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('does not call addImage when imageId becomes unavailable inside rasterisePattern', async () => {
    // Three consecutive calls to registry.get:
    //   1. getPatternImageId in registerPatterns → returns content → imageId is truthy
    //   2. getPatternInnerContent directly in rasterisePattern → returns content → passes innerContent guard
    //   3. getPatternInnerContent inside getPatternImageId in rasterisePattern → returns undefined
    //      → getPatternImageId returns null → hits the imageId null guard
    const registry = {
      get: jest.fn()
        .mockReturnValueOnce({ svgContent: SVG_CONTENT })
        .mockReturnValueOnce({ svgContent: SVG_CONTENT })
        .mockReturnValueOnce(undefined)
    }
    const map = makeMap()
    await registerPatterns(map, [{ fillPattern: 'stripes' }], OUTDOOR, registry)
    expect(map.addImage).not.toHaveBeenCalled()
  })
})
