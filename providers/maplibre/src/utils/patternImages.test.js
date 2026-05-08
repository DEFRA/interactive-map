import { addPatternsToMap } from './patternImages.js'
import { patternRegistry } from '../../../../src/services/patternRegistry.js'

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

// ─── addPatternsToMap ─────────────────────────────────────────────────────────
describe('addPatternsToMap', () => {
  beforeEach(() => {
    // Clear the registry and re-register a known pattern to ensure consistent test conditions
    patternRegistry.clear()
    patternRegistry.register('stripes', SVG_CONTENT)
  })
  describe('addPatternsToMap — registration', () => {
    it('returns early and does not touch map for empty configs', async () => {
      const map = makeMap()
      await addPatternsToMap(map, [], OUTDOOR, patternRegistry)
      expect(map.hasImage).not.toHaveBeenCalled()
      expect(map.addImage).not.toHaveBeenCalled()
    })

    it('calls addImage for an inline fillPatternSvgContent config', async () => {
      const map = makeMap()
      const config = { fillPatternSvgContent: SVG_CONTENT }
      await addPatternsToMap(map, [config], OUTDOOR, patternRegistry)
      expect(map.addImage).toHaveBeenCalledTimes(1)
    })

    it('skips addImage when image is already registered', async () => {
      const style = { fillPattern: 'stripes' }
      const pixelRatio = 1
      const map = makeMap(['pattern-mpxwil-2x'])
      await addPatternsToMap(map, [style], OUTDOOR, patternRegistry, pixelRatio)
      expect(map.addImage).not.toHaveBeenCalled()
    })

    it('skips config when pattern has no inner content', async () => {
      const map = makeMap()
      patternRegistry.clear()
      await addPatternsToMap(map, [{ fillPattern: 'unknown' }], OUTDOOR, patternRegistry)
      expect(map.addImage).not.toHaveBeenCalled()
    })

    it('skips config when neither fillPattern nor fillPatternSvgContent is set', async () => {
      const map = makeMap()
      await addPatternsToMap(map, [{ fillColor: '#ff0000' }], OUTDOOR, patternRegistry)
      expect(map.addImage).not.toHaveBeenCalled()
    })

    it('processes multiple configs in parallel', async () => {
      const map = makeMap()
      patternRegistry.register('dots', "fillPatternForegroundColor: '#aabbcc', fillPatternBackgroundColor: '#112233'")
      console.log('patternRegistry.list', patternRegistry.list())
      await addPatternsToMap(map, [{ fillPattern: 'stripes' }, { fillPattern: 'dots' }], OUTDOOR, patternRegistry)
      expect(map.addImage).toHaveBeenCalledTimes(2)
    })
  })

  describe('addPatternsToMap — pixel ratio', () => {
    it('encodes effectiveRatio in the image ID and passes it to addImage', async () => {
      const map = makeMap()
      const config = { fillPattern: 'stripes' }
      await addPatternsToMap(map, [config], OUTDOOR, patternRegistry, 2)
      expect(map.addImage).toHaveBeenCalledTimes(1)
      expect(map.addImage).toHaveBeenCalledWith(
        expect.stringMatching(/^pattern-[a-z0-9]+-4x$/),
        expect.any(Object),
        { pixelRatio: 4 }
      )
    })

    it('floors effectiveRatio at 2 so low-DPI patterns stay crisp', async () => {
      const map = makeMap()
      const config = { fillPattern: 'stripes' }
      await addPatternsToMap(map, [config], OUTDOOR, patternRegistry, 1)
      expect(map.addImage).toHaveBeenCalledWith(
        expect.stringMatching(/-2x$/),
        expect.any(Object),
        { pixelRatio: 2 }
      )
    })

    it('produces different image IDs for ratios above the floor', async () => {
      const map1 = makeMap()
      const map2 = makeMap()
      const config = { fillPattern: 'stripes' }
      const hiDpi = 3
      await addPatternsToMap(map1, [config], OUTDOOR, patternRegistry, 2)
      await addPatternsToMap(map2, [config], OUTDOOR, patternRegistry, hiDpi)
      const [id2x] = map1.addImage.mock.calls[0]
      const [id3x] = map2.addImage.mock.calls[0]
      expect(id2x).not.toBe(id3x)
      expect(id2x).toMatch(/-4x$/)
      expect(id3x).toMatch(/-6x$/)
    })
  })

  describe('addPatternsToMap — color resolution and caching', () => {
    it('applies foreground and background colors when resolving the SVG', async () => {
      const map = makeMap()
      const getContextSpy = HTMLCanvasElement.prototype.getContext
      await addPatternsToMap(
        map,
        [{ fillPattern: 'stripes', fillPatternForegroundColor: '#aabbcc', fillPatternBackgroundColor: '#112233' }],
        OUTDOOR,
        patternRegistry
      )
      expect(map.addImage).toHaveBeenCalledTimes(1)
      expect(getContextSpy).toHaveBeenCalled()
    })

    it('resolves style-keyed foreground color for the given mapStyleId', async () => {
      const map = makeMap()
      const config = {
        fillPattern: 'stripes',
        fillPatternForegroundColor: { outdoor: '#aabbcc', dark: '#112233' }
      }
      await addPatternsToMap(map, [config], OUTDOOR, patternRegistry)
      const map2 = makeMap()
      await addPatternsToMap(map2, [config], 'dark', patternRegistry)
      const [idOutdoor] = map.addImage.mock.calls[0]
      const [idDark] = map2.addImage.mock.calls[0]
      expect(idOutdoor).not.toBe(idDark)
    })

    it('uses cached ImageData on second call with identical config', async () => {
      const map = makeMap()
      const config = { fillPattern: 'stripes', fillPatternForegroundColor: '#unique2' }
      const pixelRatio = 2
      await addPatternsToMap(map, [config], OUTDOOR, patternRegistry, pixelRatio)
      const imageId = patternRegistry.getPatternImageId(config, OUTDOOR, pixelRatio)
      const map2 = makeMap([imageId])
      await addPatternsToMap(map2, [config], OUTDOOR, patternRegistry, pixelRatio)
      expect(map2.addImage).not.toHaveBeenCalled()
    })
  })

  describe('addPatternsToMap — null results', () => {
    it('does not call addImage when innerContent becomes unavailable inside rasterisePattern', async () => {
      const getPatternInnerContent = jest.spyOn(patternRegistry, 'getPatternInnerContent').mockReturnValue(undefined)
      const getPatternImageId = jest.spyOn(patternRegistry, 'getPatternImageId').mockReturnValue('test-id')

      const map = makeMap()
      await addPatternsToMap(map, [{ fillPattern: 'stripes' }], OUTDOOR, patternRegistry)
      expect(map.addImage).not.toHaveBeenCalled()

      getPatternImageId.mockRestore()
      getPatternInnerContent.mockRestore()
    })

    it('does not call addImage when imageId becomes unavailable inside rasterisePattern', async () => {
      const getPatternInnerContent = jest.spyOn(patternRegistry, 'getPatternInnerContent').mockReturnValue('CONTENT')
      const getPatternImageId = jest.spyOn(patternRegistry, 'getPatternImageId')
        .mockReturnValueOnce('test-id')
        .mockReturnValueOnce(undefined)
      const map = makeMap()
      await addPatternsToMap(map, [{ fillPattern: 'stripes' }], OUTDOOR, patternRegistry)
      expect(map.addImage).not.toHaveBeenCalled()
      getPatternImageId.mockRestore()
      getPatternInnerContent.mockRestore()
    })
  })
})
