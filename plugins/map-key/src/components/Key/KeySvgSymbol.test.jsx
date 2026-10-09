import { render } from '@testing-library/react'
import { KeySvgSymbol } from './KeySvgSymbol'

const keySymbol = (viewBox, svg = '<path d="M0 0"/>') => ({ svg, viewBox })

describe('KeySvgSymbol', () => {
  it('draws the symbol 1:1, centred in a fixed 44×44 box it may overflow', () => {
    const { container } = render(<KeySvgSymbol keySymbol={keySymbol('0 0 42 48')} />)
    const [outer, inner] = container.querySelectorAll('svg')
    expect(outer.getAttribute('width')).toBe('44')
    expect(outer.getAttribute('height')).toBe('44')
    expect(outer.getAttribute('viewBox')).toBe('0 0 44 44')
    expect(outer.getAttribute('overflow')).toBe('visible')
    expect([inner.getAttribute('x'), inner.getAttribute('y')]).toEqual(['1', '-2'])
    expect([inner.getAttribute('width'), inner.getAttribute('height')]).toEqual(['42', '48'])
  })

  it('clips the symbol to its own viewBox, as on the map', () => {
    const { container } = render(<KeySvgSymbol keySymbol={keySymbol('10 10 30 30')} />)
    const inner = container.querySelectorAll('svg')[1]
    expect(inner.getAttribute('viewBox')).toBe('10 10 30 30')
    expect(inner.getAttribute('overflow')).toBe('hidden')
  })

  it('scales a symbol bigger than the key maximum down to fit it', () => {
    const { container } = render(<KeySvgSymbol keySymbol={keySymbol('0 0 112 56')} />)
    const inner = container.querySelectorAll('svg')[1]
    expect([inner.getAttribute('width'), inner.getAttribute('height')]).toEqual(['56', '28'])
    expect([inner.getAttribute('x'), inner.getAttribute('y')]).toEqual(['-6', '8'])
  })

  it('renders the symbol\'s svg inside a g element', () => {
    const { container } = render(<KeySvgSymbol keySymbol={keySymbol('0 0 38 38', '<circle id="sym-el"/>')} />)
    expect(container.querySelector('#sym-el')).toBeTruthy()
  })

  it('renders nothing without a key symbol', () => {
    const { container } = render(<KeySvgSymbol keySymbol={null} />)
    expect(container.firstChild).toBeNull()
  })
})
