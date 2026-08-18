import { render, screen } from '@testing-library/react'
import { Key } from './Key'

jest.mock('./EmptyKey.jsx', () => ({
  EmptyKey: ({ text }) => <div data-testid='empty-key'>{text}</div>
}))

jest.mock('./KeyItem.jsx', () => ({
  KeyItem: () => <div data-testid='key-item' />
}))

jest.mock('./KeyGroupItem.jsx', () => ({
  KeyGroupItem: ({ label }) => <div data-testid='key-group-item'>{label}</div>
}))

const mapStyle = { id: 'default' }

describe('Key', () => {
  it('renders EmptyKey when keyGroups is undefined', () => {
    render(<Key mapStyle={mapStyle} />)
    expect(screen.getByTestId('empty-key')).toBeTruthy()
  })

  it('renders EmptyKey when keyGroups is an empty array', () => {
    render(<Key mapStyle={mapStyle} keyGroups={[]} />)
    expect(screen.getByTestId('empty-key')).toBeTruthy()
  })

  it('passes noKeyItemText to EmptyKey', () => {
    render(<Key mapStyle={mapStyle} noKeyItemText='No items' />)
    expect(screen.getByText('No items')).toBeTruthy()
  })

  it('renders the wrapper div with the base class', () => {
    const { container } = render(<Key mapStyle={mapStyle} keyGroups={[{ id: '1', keyDefinition: { id: '1' } }]} />)
    expect(container.querySelector('.im-c-map-key')).toBeTruthy()
  })

  it('adds the groups class when hasGroups is true', () => {
    const { container } = render(<Key mapStyle={mapStyle} keyGroups={[{ id: '1', keyDefinition: { id: '1' } }]} hasGroups={true} />)
    expect(container.querySelector('.im-c-map-key--has-groups')).toBeTruthy()
  })

  it('does not add the groups class when hasGroups is false', () => {
    const { container } = render(<Key mapStyle={mapStyle} keyGroups={[{ id: '1', keyDefinition: { id: '1' } }]} hasGroups={false} />)
    expect(container.querySelector('.im-c-map-key--has-groups')).toBeNull()
  })

  it('renders KeyItem for a non-group item', () => {
    render(<Key mapStyle={mapStyle} keyGroups={[{ id: '1', keyDefinition: { id: '1' } }]} />)
    expect(screen.getByTestId('key-item')).toBeTruthy()
  })

  it('renders KeyGroupItem for a group item', () => {
    render(<Key mapStyle={mapStyle} keyGroups={[{ id: '1', type: 'group', groupLabel: 'Group A', keyDefinitions: [] }]} />)
    expect(screen.getByTestId('key-group-item')).toBeTruthy()
  })

  it('passes groupLabel to KeyGroupItem', () => {
    render(<Key mapStyle={mapStyle} keyGroups={[{ id: '1', type: 'group', groupLabel: 'My Group', keyDefinitions: [] }]} />)
    expect(screen.getByText('My Group')).toBeTruthy()
  })

  it('renders mixed group and non-group items', () => {
    const keyGroups = [
      { id: '1', keyDefinition: { id: '1' } },
      { id: '2', type: 'group', groupLabel: 'Group A', keyDefinitions: [] }
    ]
    render(<Key mapStyle={mapStyle} keyGroups={keyGroups} />)
    expect(screen.getAllByTestId('key-item')).toHaveLength(1)
    expect(screen.getAllByTestId('key-group-item')).toHaveLength(1)
  })
})
