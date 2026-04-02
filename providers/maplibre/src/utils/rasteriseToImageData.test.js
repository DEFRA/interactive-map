import { rasteriseToImageData } from './rasteriseToImageData.js'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="8"/></svg>'
const WIDTH = 32
const HEIGHT = 32

// Mirrors SVG_ERROR_PREVIEW_LENGTH in rasteriseToImageData.js
const ERROR_PREVIEW_LENGTH = 80
// Length chosen to be well over ERROR_PREVIEW_LENGTH so truncation is exercised
const LONG_CONTENT_LENGTH = 200

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

beforeEach(() => {
  jest.clearAllMocks()
  globalThis.URL.createObjectURL.mockReturnValue('blob:mock')
})

describe('rasteriseToImageData', () => {
  it('resolves with ImageData at the requested dimensions, draws via canvas, and revokes the blob URL', async () => {
    const getContext = HTMLCanvasElement.prototype.getContext
    const result = await rasteriseToImageData(SVG, WIDTH, HEIGHT)
    expect(result).toMatchObject({ width: WIDTH, height: HEIGHT })
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    const { drawImage, getImageData } = getContext.mock.results[0].value
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 0, WIDTH, HEIGHT)
    expect(getImageData).toHaveBeenCalledWith(0, 0, WIDTH, HEIGHT)
  })

  it('rejects with a truncated SVG preview and revokes the blob URL on error', async () => {
    const originalImage = globalThis.Image
    globalThis.Image = class {
      constructor (w, h) { this.width = w; this.height = h; this._src = '' }
      get src () { return this._src }
      set src (val) { this._src = val; this.onerror?.() }
    }
    try {
      const longSvg = `<svg>${'x'.repeat(LONG_CONTENT_LENGTH)}</svg>`
      const error = await rasteriseToImageData(longSvg, WIDTH, HEIGHT).catch(e => e)
      expect(error.message).toMatch('Failed to rasterise SVG')
      const preview = error.message.replace('Failed to rasterise SVG: ', '')
      expect(preview).toHaveLength(ERROR_PREVIEW_LENGTH)
      expect(preview).toBe(longSvg.slice(0, ERROR_PREVIEW_LENGTH))
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    } finally {
      globalThis.Image = originalImage
    }
  })
})
