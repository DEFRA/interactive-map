import { getCachedSymbolImage, getOrCreateSymbolImage, clearSymbolImageCache } from './symbolImages.js'

const imageData = (width, height) => ({ width, height })

beforeEach(() => {
  clearSymbolImageCache()
  // Memoized per-canvas so `canvas.getContext()` returns the same mock object on repeat
  // calls (real canvases do the same) — needed so assertions and the code under test see
  // the same putImageData spy, not two different ones from two different mock calls.
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    this._ctx ??= { putImageData: jest.fn() }
    return this._ctx
  })
})

describe('getCachedSymbolImage', () => {
  it('returns undefined for an id that has never been registered', () => {
    expect(getCachedSymbolImage('symbol-unseen')).toBeUndefined()
  })

  it('returns the cached canvas after getOrCreateSymbolImage has resolved it', () => {
    const canvas = getOrCreateSymbolImage('symbol-a', imageData(20, 30))
    expect(getCachedSymbolImage('symbol-a')).toBe(canvas)
  })
})

describe('getOrCreateSymbolImage', () => {
  it('draws the ImageData onto a canvas sized to match it', () => {
    const canvas = getOrCreateSymbolImage('symbol-b', imageData(44, 60))
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(canvas.width).toBe(44)
    expect(canvas.height).toBe(60)
    expect(canvas.getContext().putImageData).toHaveBeenCalledWith(imageData(44, 60), 0, 0)
  })

  it('rasterises only once — a second call with the same id returns the same canvas without redrawing', () => {
    const first = getOrCreateSymbolImage('symbol-c', imageData(10, 10))
    const contextCallsAfterFirst = HTMLCanvasElement.prototype.getContext.mock.calls.length
    const second = getOrCreateSymbolImage('symbol-c', imageData(10, 10))
    expect(second).toBe(first)
    expect(HTMLCanvasElement.prototype.getContext.mock.calls).toHaveLength(contextCallsAfterFirst)
  })

  it('different ids get independent canvases', () => {
    const a = getOrCreateSymbolImage('symbol-d', imageData(10, 10))
    const b = getOrCreateSymbolImage('symbol-e', imageData(20, 20))
    expect(a).not.toBe(b)
  })
})

describe('clearSymbolImageCache', () => {
  it('forces the next getOrCreateSymbolImage call to rasterise again', () => {
    const first = getOrCreateSymbolImage('symbol-f', imageData(10, 10))
    clearSymbolImageCache()
    const second = getOrCreateSymbolImage('symbol-f', imageData(10, 10))
    expect(second).not.toBe(first)
  })
})
