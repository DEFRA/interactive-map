import { applyOpenLayersFixes } from './openLayersFixes.js'

let origGetContext

beforeEach(() => {
  origGetContext = HTMLCanvasElement.prototype.getContext
})

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = origGetContext
})

const applyFix = (spy) => {
  HTMLCanvasElement.prototype.getContext = spy
  applyOpenLayersFixes()
}

describe('applyOpenLayersFixes', () => {
  it('adds willReadFrequently: true to 2D context requests', () => {
    const spy = jest.fn()
    applyFix(spy)
    document.createElement('canvas').getContext('2d')
    expect(spy).toHaveBeenCalledWith('2d', { willReadFrequently: true })
  })

  it('willReadFrequently: true wins over an explicit false', () => {
    const spy = jest.fn()
    applyFix(spy)
    document.createElement('canvas').getContext('2d', { willReadFrequently: false })
    expect(spy).toHaveBeenCalledWith('2d', { willReadFrequently: true })
  })

  it('preserves other 2D context attributes', () => {
    const spy = jest.fn()
    applyFix(spy)
    document.createElement('canvas').getContext('2d', { alpha: false })
    expect(spy).toHaveBeenCalledWith('2d', { alpha: false, willReadFrequently: true })
  })

  it('does not modify non-2D context requests', () => {
    const spy = jest.fn()
    applyFix(spy)
    document.createElement('canvas').getContext('webgl', { antialias: true })
    expect(spy).toHaveBeenCalledWith('webgl', { antialias: true })
  })

  it('does nothing in environments without HTMLCanvasElement', () => {
    const orig = global.HTMLCanvasElement
    delete global.HTMLCanvasElement
    expect(() => applyOpenLayersFixes()).not.toThrow()
    global.HTMLCanvasElement = orig
  })
})
