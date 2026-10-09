import { render, screen } from '@testing-library/react'
import { KeyGroupItem } from './KeyGroupItem'
import { useRampOrientation } from './useRampOrientation.js'

jest.mock('./useRampOrientation.js', () => ({
  useRampOrientation: jest.fn(() => 'horizontal')
}))

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
    expect(container.querySelector('.im-c-map-key__group')).toBeTruthy()
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
    expect(container.querySelector('.im-c-map-key__group-heading')).toBeTruthy()
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

  it('appends the groupStyle modifier class to the dl when groupStyle is provided', () => {
    const { container } = render(<KeyGroupItem {...baseProps} groupStyle='other' />)
    expect(container.querySelector('dl').className).toBe('im-c-map-key-list im-c-map-key-list--other')
  })

  it('adds the measured orientation to a ramp', () => {
    const keyDefinitions = [{ id: 'a', label: 'Low', style: {} }, { id: 'b', label: 'High', style: {} }]
    const { container } = render(<KeyGroupItem {...baseProps} groupStyle='ramp' keyDefinitions={keyDefinitions} />)
    expect(container.querySelector('dl').className).toBe('im-c-map-key-list im-c-map-key-list--ramp im-c-map-key-list--ramp-horizontal')
    expect(useRampOrientation).toHaveBeenLastCalledWith(expect.anything(), ['Low', 'High'], true, false)
  })

  it('renders a vertical ramp when the labels do not fit', () => {
    useRampOrientation.mockReturnValueOnce('vertical')
    const { container } = render(<KeyGroupItem {...baseProps} groupStyle='ramp' />)
    expect(container.querySelector('dl').className).toBe('im-c-map-key-list im-c-map-key-list--ramp im-c-map-key-list--ramp-vertical')
  })

  it('shows a ramp with any symbol entries as a standard group', () => {
    const keyDefinitions = [{ id: 'a', label: 'Low', style: { fill: '#000' } }, { id: 'b', label: 'High', style: { symbol: 'pin' } }]
    const { container } = render(<KeyGroupItem {...baseProps} groupStyle='ramp' keyDefinitions={keyDefinitions} />)
    expect(container.querySelector('dl').className).toBe('im-c-map-key-list')
    expect(useRampOrientation).toHaveBeenLastCalledWith(expect.anything(), ['Low', 'High'], false, false)
  })

  it('does not measure groups that are not ramps', () => {
    render(<KeyGroupItem {...baseProps} />)
    expect(useRampOrientation).toHaveBeenLastCalledWith(expect.anything(), [], false, false)
  })

  it('adds the has-stroke modifier to a ramp when any item has a stroke', () => {
    const keyDefinitions = [{ id: 'a', style: { fill: '#000' } }, { id: 'b', style: { stroke: { default: '#123' } } }]
    const { container } = render(<KeyGroupItem {...baseProps} groupStyle='ramp' keyDefinitions={keyDefinitions} />)
    expect(container.querySelector('dl').className).toBe('im-c-map-key-list im-c-map-key-list--ramp im-c-map-key-list--ramp-horizontal im-c-map-key-list--has-stroke')
  })

  it('omits the has-stroke modifier when no ramp item has a stroke', () => {
    const keyDefinitions = [{ id: 'a', style: { fill: '#000' } }, { id: 'b', style: { fillPattern: 'dot' } }]
    const { container } = render(<KeyGroupItem {...baseProps} groupStyle='ramp' keyDefinitions={keyDefinitions} />)
    expect(container.querySelector('dl').className).toBe('im-c-map-key-list im-c-map-key-list--ramp im-c-map-key-list--ramp-horizontal')
  })

  it('uses the base dl class when groupStyle is not provided', () => {
    const { container } = render(<KeyGroupItem {...baseProps} />)
    expect(container.querySelector('dl').className).toBe('im-c-map-key-list')
  })
})
