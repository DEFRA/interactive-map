import { render, screen } from '@testing-library/react'
import { KeyGroupItem } from './KeyGroupItem'

jest.mock('./KeyItem.jsx', () => ({
  KeyItem: ({ keyDefinition }) => <div data-testid='key-item'>{keyDefinition.id}</div>
}))

const mapStyle = { id: 'default' }

const baseProps = {
  headingId: 'key-heading-1',
  label: 'My Group',
  keyDefinitions: [],
  mapStyle
}

describe('KeyGroupItem', () => {
  it('renders a section with the group class', () => {
    const { container } = render(<KeyGroupItem {...baseProps} />)
    expect(container.querySelector('.im-c-menu__group')).toBeTruthy()
  })

  it('sets aria-labelledby to headingId on the section', () => {
    const { container } = render(<KeyGroupItem {...baseProps} />)
    expect(container.querySelector('section').getAttribute('aria-labelledby')).toBe('key-heading-1')
  })

  it('renders the heading with the correct id', () => {
    render(<KeyGroupItem {...baseProps} />)
    expect(document.getElementById('key-heading-1')).toBeTruthy()
  })

  it('renders the heading with the group-heading class', () => {
    const { container } = render(<KeyGroupItem {...baseProps} />)
    expect(container.querySelector('.im-c-menu__group-heading')).toBeTruthy()
  })

  it('renders the label text in the heading', () => {
    render(<KeyGroupItem {...baseProps} />)
    expect(screen.getByText('My Group')).toBeTruthy()
  })

  it('renders a KeyItem for each keyDefinition', () => {
    const keyDefinitions = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    render(<KeyGroupItem {...baseProps} keyDefinitions={keyDefinitions} />)
    expect(screen.getAllByTestId('key-item')).toHaveLength(3)
  })

  it('renders no KeyItems when keyDefinitions is empty', () => {
    render(<KeyGroupItem {...baseProps} keyDefinitions={[]} />)
    expect(screen.queryAllByTestId('key-item')).toHaveLength(0)
  })
})
