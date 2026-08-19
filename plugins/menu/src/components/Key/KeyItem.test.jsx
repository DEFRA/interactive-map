import { render, screen } from '@testing-library/react'
import { KeyItem } from './KeyItem'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'

jest.mock('../../../../../src/utils/getValueForStyle.js', () => ({
  getValueForStyle: jest.fn()
}))

jest.mock('./KeySvg.jsx', () => ({
  KeySvg: () => <svg data-testid='key-svg' />
}))

const mapStyle = { id: 'default' }

const baseKeyDefinition = {
  id: '1',
  label: 'My Label',
  symbolDescription: null
}

beforeEach(() => {
  getValueForStyle.mockReturnValue(null)
})

describe('KeyItem', () => {
  it('renders a dl with the item class', () => {
    const { container } = render(<KeyItem keyDefinition={baseKeyDefinition} mapStyle={mapStyle} />)
    expect(container.querySelector('.im-c-menu__item')).toBeTruthy()
  })

  it('renders the symbol dt with the correct class', () => {
    const { container } = render(<KeyItem keyDefinition={baseKeyDefinition} mapStyle={mapStyle} />)
    expect(container.querySelector('.im-c-menu__item-symbol')).toBeTruthy()
  })

  it('renders KeySvg inside the symbol dt', () => {
    render(<KeyItem keyDefinition={baseKeyDefinition} mapStyle={mapStyle} />)
    expect(screen.getByTestId('key-svg')).toBeTruthy()
  })

  it('renders the label dd with the correct class', () => {
    const { container } = render(<KeyItem keyDefinition={baseKeyDefinition} mapStyle={mapStyle} />)
    expect(container.querySelector('.im-c-menu__item-label')).toBeTruthy()
  })

  it('renders the label text', () => {
    render(<KeyItem keyDefinition={baseKeyDefinition} mapStyle={mapStyle} />)
    expect(screen.getByText('My Label')).toBeTruthy()
  })

  it('renders the symbol description when getValueForStyle returns a value', () => {
    getValueForStyle.mockReturnValue('A marker symbol')
    render(<KeyItem keyDefinition={{ ...baseKeyDefinition, symbolDescription: 'A marker symbol' }} mapStyle={mapStyle} />)
    expect(screen.getByText('(A marker symbol)')).toBeTruthy()
  })

  it('does not render the symbol description span when getValueForStyle returns null', () => {
    render(<KeyItem keyDefinition={baseKeyDefinition} mapStyle={mapStyle} />)
    expect(screen.queryByRole('presentation')).toBeNull()
    expect(document.querySelector('.govuk-visually-hidden')).toBeNull()
  })

  it('calls getValueForStyle with the symbolDescription and mapStyle id', () => {
    render(<KeyItem keyDefinition={{ ...baseKeyDefinition, symbolDescription: 'desc' }} mapStyle={mapStyle} />)
    expect(getValueForStyle).toHaveBeenCalledWith('desc', 'default')
  })
})
