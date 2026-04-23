import { render } from '@testing-library/react'
import { KeySvgSymbol } from './KeySvgSymbol'

import { getSymbolStyleColors, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'

jest.mock('../../../../../src/utils/symbolUtils.js', () => ({
  getSymbolStyleColors: jest.fn(() => ({ foreground: '#000', background: '#fff' })),
  getSymbolViewBox: jest.fn(() => '0 0 38 38')
}))

const mockResolve = jest.fn(() => '<path d="M0 0"/>')

const defaultProps = {
  symbolDef: { id: 'marker' },
  symbolRegistry: { resolve: mockResolve },
  mapStyle: { id: 'default' },
  stroke: '#000000'
}

beforeEach(() => {
  mockResolve.mockClear()
  mockResolve.mockReturnValue('<path d="M0 0"/>')
  getSymbolStyleColors.mockReturnValue({ foreground: '#000', background: '#fff' })
  getSymbolViewBox.mockReturnValue('0 0 38 38')
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
    expect(getSymbolStyleColors).toHaveBeenCalledWith(defaultProps)
  })

  it('calls getSymbolViewBox with the dataset props and symbolDef', () => {
    render(<KeySvgSymbol {...defaultProps} />)
    expect(getSymbolViewBox).toHaveBeenCalledWith(defaultProps, defaultProps.symbolDef)
  })

  it('sets the viewBox from getSymbolViewBox', () => {
    getSymbolViewBox.mockReturnValue('0 0 64 64')
    const { container } = render(<KeySvgSymbol {...defaultProps} />)
    expect(container.querySelector('svg').getAttribute('viewBox')).toBe('0 0 64 64')
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
})
