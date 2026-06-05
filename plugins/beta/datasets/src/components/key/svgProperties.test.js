import { SVG_SIZE, SVG_CENTER, svgProps, svgSymbolProps } from './svgProperties'

describe('svgProperties constants', () => {
  it('SVG_SIZE is 20', () => {
    expect(SVG_SIZE).toBe(20)
  })

  it('SVG_CENTER is half of SVG_SIZE', () => {
    expect(SVG_CENTER).toBe(SVG_SIZE / 2)
  })
})

describe('svgProps', () => {
  it('has the correct xmlns', () => {
    expect(svgProps.xmlns).toBe('http://www.w3.org/2000/svg')
  })

  it('has width and height equal to SVG_SIZE', () => {
    expect(svgProps.width).toBe(SVG_SIZE)
    expect(svgProps.height).toBe(SVG_SIZE)
  })

  it('has viewBox covering the full SVG_SIZE', () => {
    expect(svgProps.viewBox).toBe(`0 0 ${SVG_SIZE} ${SVG_SIZE}`)
  })

  it('has the correct className', () => {
    expect(svgProps.className).toBe('am-c-datasets-key-symbol')
  })

  it('is aria-hidden', () => {
    expect(svgProps['aria-hidden']).toBe('true')
  })

  it('is not focusable', () => {
    expect(svgProps.focusable).toBe('false')
  })
})

describe('svgSymbolProps', () => {
  it('inherits xmlns from svgProps', () => {
    expect(svgSymbolProps.xmlns).toBe(svgProps.xmlns)
  })

  it('has a larger width than svgProps', () => {
    expect(svgSymbolProps.width).toBeGreaterThan(svgProps.width)
  })

  it('has a larger height than svgProps', () => {
    expect(svgSymbolProps.height).toBeGreaterThan(svgProps.height)
  })

  it('width and height are equal', () => {
    expect(svgSymbolProps.width).toBe(svgSymbolProps.height)
  })

  it('className includes the base class and a modifier', () => {
    expect(svgSymbolProps.className).toContain('am-c-datasets-key-symbol')
    expect(svgSymbolProps.className).toContain('--point')
  })
})
