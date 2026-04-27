import { rasteriseToImageData } from './rasteriseToImageData.js'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="8"/></svg>'
const WIDTH = 32
const HEIGHT = 32

// Mirrors SVG_ERROR_PREVIEW_LENGTH in rasteriseToImageData.js
const ERROR_PREVIEW_LENGTH = 80
// Length chosen to be well over ERROR_PREVIEW_LENGTH so truncation is exercised
const LONG_CONTENT_LENGTH = 200

let imageInstances = []

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn((_x, _y, w, h) => ({ width: w, height: h }))
  }))
})

beforeEach(() => {
  imageInstances = []
  jest.clearAllMocks()

  globalThis.Image = class {
    constructor (w, h) {
      this.width = w
      this.height = h
      this._src = ''
      imageInstances.push(this)
    }

    get src () { return this._src }
    set src (val) { this._src = val; this.onload?.() }
  }
})

describe('rasteriseToImageData', () => {
  it('resolves with ImageData at the requested dimensions and draws via canvas', async () => {
    const getContext = HTMLCanvasElement.prototype.getContext
    const result = await rasteriseToImageData(SVG, WIDTH, HEIGHT)
    expect(result).toMatchObject({ width: WIDTH, height: HEIGHT })
    const { drawImage, getImageData } = getContext.mock.results[0].value
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 0, WIDTH, HEIGHT)
    expect(getImageData).toHaveBeenCalledWith(0, 0, WIDTH, HEIGHT)
  })

  it('sets img.src to a data URI rather than a blob URL', async () => {
    await rasteriseToImageData(SVG, WIDTH, HEIGHT)
    const src = imageInstances[0]._src
    expect(src).toMatch(/^data:image\/svg\+xml;charset=utf-8,/)
    expect(src).toContain(encodeURIComponent(SVG))
  })

  it('rejects with a truncated SVG preview on error', async () => {
    globalThis.Image = class {
      constructor (w, h) { this.width = w; this.height = h; this._src = '' }
      get src () { return this._src }
      set src (val) { this._src = val; this.onerror?.() }
    }
    const longSvg = `<svg>${'x'.repeat(LONG_CONTENT_LENGTH)}</svg>`
    const error = await rasteriseToImageData(longSvg, WIDTH, HEIGHT).catch(e => e)
    expect(error.message).toMatch('Failed to rasterise SVG')
    const preview = error.message.replace('Failed to rasterise SVG: ', '')
    expect(preview).toHaveLength(ERROR_PREVIEW_LENGTH)
    expect(preview).toBe(longSvg.slice(0, ERROR_PREVIEW_LENGTH))
  })
})
