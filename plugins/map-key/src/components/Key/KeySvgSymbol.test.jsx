import { render } from '@testing-library/react'
import { KeySvgSymbol } from './KeySvgSymbol'
import { getSymbolStyleColors } from '../../../../../src/utils/symbolUtils.js'
import { symbolRegistry } from '../../registry/index.js'

jest.mock('../../../../../src/utils/symbolUtils.js', () => ({
  getSymbolStyleColors: jest.fn(() => ({ foreground: '#000', background: '#fff' }))
}))

const mockResolve = jest.spyOn(symbolRegistry, 'resolve')

const defaultProps = {
  symbolDef: { id: 'marker', viewBox: '0 0 38 38' },
  keyDefinition: {
    style: {
      stroke: '#000000'
    }
  },
  mapStyle: { id: 'default' }
}

beforeEach(() => {
  mockResolve.mockClear()
  mockResolve.mockReturnValue('<path d="M0 0"/>')
  getSymbolStyleColors.mockReturnValue({ foreground: '#000', background: '#fff' })
})

describe('KeySvgSymbol', () => {
  it('renders an svg element', () => {
    const { container } = render(<KeySvgSymbol {...defaultProps} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('calls symbolRegistry.resolve with the symbolDef, style colors, and mapStyle', () => {
    render(<KeySvgSymbol {...defaultProps} />)
    expect(mockResolve).toHaveBeenCalledWith(
      defaultProps.symbolDef,
      { foreground: '#000', background: '#fff' },
      expect.objectContaining({ id: 'default' })
    )
  })

  it('calls getSymbolStyleColors with the dataset props', () => {
    render(<KeySvgSymbol {...defaultProps} />)
    expect(getSymbolStyleColors).toHaveBeenCalledWith(defaultProps.keyDefinition.style)
  })

  it('draws the symbol 1:1, centred in a fixed 44×44 box it may overflow', () => {
    const { container } = render(<KeySvgSymbol {...defaultProps} symbolDef={{ id: 'marker', viewBox: '0 0 42 48' }} />)
    const [outer, inner] = container.querySelectorAll('svg')
    expect(outer.getAttribute('width')).toBe('44')
    expect(outer.getAttribute('height')).toBe('44')
    expect(outer.getAttribute('viewBox')).toBe('0 0 44 44')
    expect(outer.getAttribute('overflow')).toBe('visible')
    expect([inner.getAttribute('x'), inner.getAttribute('y')]).toEqual(['1', '-2'])
    expect([inner.getAttribute('width'), inner.getAttribute('height')]).toEqual(['42', '48'])
  })

  it('clips the symbol to its own viewBox, as on the map', () => {
    const { container } = render(<KeySvgSymbol {...defaultProps} symbolDef={{ id: 'marker', viewBox: '10 10 30 30' }} />)
    const inner = container.querySelectorAll('svg')[1]
    expect(inner.getAttribute('viewBox')).toBe('10 10 30 30')
    expect(inner.getAttribute('overflow')).toBe('hidden')
  })

  it('scales a symbol bigger than the key maximum down to fit it', () => {
    const { container } = render(<KeySvgSymbol {...defaultProps} symbolDef={{ id: 'marker', viewBox: '0 0 112 56' }} />)
    const inner = container.querySelectorAll('svg')[1]
    expect([inner.getAttribute('width'), inner.getAttribute('height')]).toEqual(['56', '28'])
    expect([inner.getAttribute('x'), inner.getAttribute('y')]).toEqual(['-6', '8'])
  })

  it('renders the resolved svg html inside a g element', () => {
    mockResolve.mockReturnValue('<circle id="sym-el"/>')
    const { container } = render(<KeySvgSymbol {...defaultProps} />)
    expect(container.querySelector('#sym-el')).toBeTruthy()
  })

  it('defaults mapColorScheme to light when appColorScheme is not set', () => {
    render(<KeySvgSymbol {...defaultProps} />)
    const callArg = mockResolve.mock.calls[0][2]
    expect(callArg.mapColorScheme).toBe('light')
  })

  it('uses the mapStyle appColorScheme when provided', () => {
    const props = { ...defaultProps, mapStyle: { id: 'dark', appColorScheme: 'dark' } }
    render(<KeySvgSymbol {...props} />)
    const callArg = mockResolve.mock.calls[0][2]
    expect(callArg.mapColorScheme).toBe('dark')
  })

  it('renders nothing when resolve returns falsy', () => {
    mockResolve.mockReturnValue(null)
    const { container } = render(<KeySvgSymbol {...defaultProps} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing without a symbol definition', () => {
    const { container } = render(<KeySvgSymbol {...defaultProps} symbolDef={undefined} />)
    expect(container.firstChild).toBeNull()
  })
})
