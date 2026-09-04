import { render } from '@testing-library/react'
import { KeySvg } from './KeySvg'

import { symbolRegistry } from '../../../../../src/services/symbolRegistry.js'

const getSymbolDef = jest.spyOn(symbolRegistry, 'getSymbolDef')

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

jest.mock('./KeySvgRamp.jsx', () => ({
  KeySvgRamp: () => <svg data-testid='key-svg-horizontal-ramp' />
}))

const baseKeyDefinition = {
  hasSymbol: false,
  hasPattern: false,
  style: {}
}

const baseProps = {
  mapStyle: { id: 'default' },
  keyDefinition: baseKeyDefinition
}

beforeEach(() => {
  getSymbolDef.mockReturnValue(null)
})

describe('KeySvg', () => {
  it('renders KeySvgSymbol when a symbolDef is resolved', () => {
    getSymbolDef.mockReturnValue({ id: 'marker' })
    const { getByTestId } = render(<KeySvg {...baseProps} keyDefinition={{ ...baseKeyDefinition, hasSymbol: true }} />)
    expect(getByTestId('key-svg-symbol')).toBeTruthy()
  })

  it('renders KeySvgPattern when hasPattern is true and no symbol', () => {
    const { getByTestId } = render(<KeySvg {...baseProps} keyDefinition={{ ...baseKeyDefinition, hasPattern: true }} />)
    expect(getByTestId('key-svg-pattern')).toBeTruthy()
  })

  it('renders KeySvgLine when keySymbolShape is line and no symbol or pattern', () => {
    const { getByTestId } = render(<KeySvg {...baseProps} keyDefinition={{ ...baseKeyDefinition, style: { keySymbolShape: 'line' } }} />)
    expect(getByTestId('key-svg-line')).toBeTruthy()
  })

  it('renders KeySvgRect as the default fallback', () => {
    const { getByTestId } = render(<KeySvg {...baseProps} />)
    expect(getByTestId('key-svg-rect')).toBeTruthy()
  })

  it('prefers symbol over pattern when both are present', () => {
    getSymbolDef.mockReturnValue({ id: 'marker' })
    const { getByTestId, queryByTestId } = render(<KeySvg {...baseProps} keyDefinition={{ ...baseKeyDefinition, hasSymbol: true, hasPattern: true }} />)
    expect(getByTestId('key-svg-symbol')).toBeTruthy()
    expect(queryByTestId('key-svg-pattern')).toBeNull()
  })

  it('prefers pattern over line when both conditions are met', () => {
    const { getByTestId, queryByTestId } = render(<KeySvg {...baseProps} keyDefinition={{ ...baseKeyDefinition, hasPattern: true, style: { keySymbolShape: 'line' } }} />)
    expect(getByTestId('key-svg-pattern')).toBeTruthy()
    expect(queryByTestId('key-svg-line')).toBeNull()
  })

  it('renders KeySvgRect when keySymbolShape is not line and no symbol or pattern', () => {
    const { getByTestId } = render(<KeySvg {...baseProps} keyDefinition={{ ...baseKeyDefinition, style: { keySymbolShape: 'polygon' } }} />)
    expect(getByTestId('key-svg-rect')).toBeTruthy()
  })

  it('does not render KeySvgSymbol when hasSymbol is true but getSymbolDef returns null', () => {
    getSymbolDef.mockReturnValue(null)
    const { getByTestId } = render(<KeySvg {...baseProps} keyDefinition={{ ...baseKeyDefinition, hasSymbol: true }} />)
    expect(getByTestId('key-svg-rect')).toBeTruthy()
  })

  it('should return null if keyDefinition is undefined', () => {
    const { container } = render(<KeySvg {...baseProps} keyDefinition={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders KeySvgRamp when groupStyle is horizontal-ramp', () => {
    const { getByTestId } = render(<KeySvg {...baseProps} keyDefinition={{ ...baseKeyDefinition }} groupStyle='horizontal-ramp' />)
    expect(getByTestId('key-svg-horizontal-ramp')).toBeTruthy()
  })
})
