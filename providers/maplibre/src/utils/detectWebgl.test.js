import { getWebGL } from './detectWebgl.js'

describe('getWebGL', () => {
  const originalWebGL = window.WebGLRenderingContext
  const originalCreateElement = document.createElement

  afterEach(() => {
    window.WebGLRenderingContext = originalWebGL
    document.createElement = originalCreateElement
    jest.restoreAllMocks()
  })

  it('returns disabled if WebGL is not supported', () => {
    window.WebGLRenderingContext = undefined
    expect(getWebGL(['webgl'])).toEqual({
      isEnabled: false,
      error: 'WebGL is not supported'
    })
  })

  it('returns enabled if WebGL context is created successfully', () => {
    window.WebGLRenderingContext = class {}
    const fakeContext = { getParameter: () => true }
    document.createElement = jest.fn(() => ({
      getContext: jest.fn(() => fakeContext)
    }))
    expect(getWebGL(['webgl'])).toEqual({ isEnabled: true })
  })

  it('returns disabled if WebGL is supported but context fails', () => {
    window.WebGLRenderingContext = class {}
    document.createElement = jest.fn(() => ({
      getContext: jest.fn(() => null)
    }))
    expect(getWebGL(['webgl'])).toEqual({
      isEnabled: false,
      error: 'WebGL is supported, but disabled'
    })
  })

  it('tries multiple context names and succeeds on second', () => {
    window.WebGLRenderingContext = class {}
    let call = 0
    document.createElement = jest.fn(() => ({
      getContext: jest.fn(() => {
        call++
        return call === 2 ? { getParameter: () => true } : null
      })
    }))
    expect(getWebGL(['webgl1', 'webgl2'])).toEqual({ isEnabled: true })
  })

  it('catches errors from getContext and continues', () => {
    window.WebGLRenderingContext = class {}
    document.createElement = jest.fn(() => ({
      getContext: jest.fn(() => { throw new Error('fail') })
    }))
    expect(getWebGL(['webgl', 'webgl2'])).toEqual({
      isEnabled: false,
      error: 'WebGL is supported, but disabled'
    })
  })
})