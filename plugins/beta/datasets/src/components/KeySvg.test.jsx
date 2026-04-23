import { render } from '@testing-library/react'
import { KeySvg } from './KeySvg'

import { hasSymbol, getSymbolDef } from '../../../../../src/utils/symbolUtils.js'
import { hasPattern } from '../../../../../src/utils/patternUtils.js'

jest.mock('../../../../../src/utils/symbolUtils.js', () => ({
  hasSymbol: jest.fn(() => false),
  getSymbolDef: jest.fn(() => null)
}))

jest.mock('../../../../../src/utils/patternUtils.js', () => ({
  hasPattern: jest.fn(() => false)
}))

jest.mock('./KeySvgPattern.jsx', () => ({
  KeySvgPattern: () => <svg data-testid='key-svg-pattern' />
}))

jest.mock('./KeySvgSymbol.jsx', () => ({
  KeySvgSymbol: () => <svg data-testid='key-svg-symbol' />
}))

jest.mock('./KeySvgLine.jsx', () => ({
  KeySvgLine: () => <svg data-testid='key-svg-line' />
}))

jest.mock('./KeySvgRect.jsx', () => ({
  KeySvgRect: () => <svg data-testid='key-svg-rect' />
}))

const baseProps = {
  symbolRegistry: {},
  mapStyle: { id: 'default' }
}

beforeEach(() => {
  hasSymbol.mockReturnValue(false)
  getSymbolDef.mockReturnValue(null)
  hasPattern.mockReturnValue(false)
})

describe('KeySvg', () => {
  it('renders KeySvgSymbol when a symbolDef is resolved', () => {
    hasSymbol.mockReturnValue(true)
    getSymbolDef.mockReturnValue({ id: 'marker' })
    const { getByTestId } = render(<KeySvg {...baseProps} symbol='marker' />)
    expect(getByTestId('key-svg-symbol')).toBeTruthy()
  })

  it('renders KeySvgPattern when hasPattern is true and no symbol', () => {
    hasPattern.mockReturnValue(true)
    const { getByTestId } = render(<KeySvg {...baseProps} fillPattern='dots' />)
    expect(getByTestId('key-svg-pattern')).toBeTruthy()
  })

  it('renders KeySvgLine when keySymbolShape is line and no symbol or pattern', () => {
    const { getByTestId } = render(<KeySvg {...baseProps} keySymbolShape='line' />)
    expect(getByTestId('key-svg-line')).toBeTruthy()
  })

  it('renders KeySvgRect as the default fallback', () => {
    const { getByTestId } = render(<KeySvg {...baseProps} />)
    expect(getByTestId('key-svg-rect')).toBeTruthy()
  })

  it('prefers symbol over pattern when both are present', () => {
    hasSymbol.mockReturnValue(true)
    getSymbolDef.mockReturnValue({ id: 'marker' })
    hasPattern.mockReturnValue(true)
    const { getByTestId, queryByTestId } = render(<KeySvg {...baseProps} symbol='marker' fillPattern='dots' />)
    expect(getByTestId('key-svg-symbol')).toBeTruthy()
    expect(queryByTestId('key-svg-pattern')).toBeNull()
  })

  it('prefers pattern over line when both conditions are met', () => {
    hasPattern.mockReturnValue(true)
    const { getByTestId, queryByTestId } = render(<KeySvg {...baseProps} fillPattern='dots' keySymbolShape='line' />)
    expect(getByTestId('key-svg-pattern')).toBeTruthy()
    expect(queryByTestId('key-svg-line')).toBeNull()
  })

  it('renders KeySvgRect when keySymbolShape is not line and no symbol or pattern', () => {
    const { getByTestId } = render(<KeySvg {...baseProps} keySymbolShape='polygon' />)
    expect(getByTestId('key-svg-rect')).toBeTruthy()
  })

  it('does not render KeySvgSymbol when hasSymbol is true but getSymbolDef returns null', () => {
    hasSymbol.mockReturnValue(true)
    getSymbolDef.mockReturnValue(null)
    const { getByTestId } = render(<KeySvg {...baseProps} symbol='unknown' />)
    expect(getByTestId('key-svg-rect')).toBeTruthy()
  })
})
