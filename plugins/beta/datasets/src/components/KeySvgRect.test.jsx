import { render } from '@testing-library/react'
import { KeySvgRect } from './KeySvgRect'

import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'

jest.mock('../../../../../src/utils/getValueForStyle', () => ({
  getValueForStyle: jest.fn((value) => value)
}))

const defaultProps = {
  fill: '#0000ff',
  stroke: '#ff0000',
  strokeWidth: 2,
  mapStyle: { id: 'default' }
}

beforeEach(() => {
  getValueForStyle.mockImplementation((value) => value)
})

describe('KeySvgRect', () => {
  it('renders an svg element', () => {
    const { container } = render(<KeySvgRect {...defaultProps} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders a rect element', () => {
    const { container } = render(<KeySvgRect {...defaultProps} />)
    expect(container.querySelector('rect')).toBeTruthy()
  })

  it('resolves fill color via getValueForStyle', () => {
    render(<KeySvgRect {...defaultProps} />)
    expect(getValueForStyle).toHaveBeenCalledWith('#0000ff', 'default')
  })

  it('resolves stroke color via getValueForStyle', () => {
    render(<KeySvgRect {...defaultProps} />)
    expect(getValueForStyle).toHaveBeenCalledWith('#ff0000', 'default')
  })

  it('sets fill attribute on the rect', () => {
    const { container } = render(<KeySvgRect {...defaultProps} />)
    const rect = container.querySelector('rect')
    expect(rect.getAttribute('fill')).toBe('#0000ff')
  })

  it('sets stroke attribute on the rect', () => {
    const { container } = render(<KeySvgRect {...defaultProps} />)
    const rect = container.querySelector('rect')
    expect(rect.getAttribute('stroke')).toBe('#ff0000')
  })

  it('sets strokeWidth attribute on the rect', () => {
    const { container } = render(<KeySvgRect {...defaultProps} />)
    const rect = container.querySelector('rect')
    expect(rect.getAttribute('stroke-width')).toBe('2')
  })

  it('insets the rect by half the strokeWidth', () => {
    const { container } = render(<KeySvgRect {...defaultProps} />)
    const rect = container.querySelector('rect')
    expect(rect.getAttribute('x')).toBe('1') // strokeWidth / 2
    expect(rect.getAttribute('y')).toBe('1')
    expect(rect.getAttribute('width')).toBe('18') // SVG_SIZE - strokeWidth
    expect(rect.getAttribute('height')).toBe('18')
  })

  it('uses strokeWidth as the rx and ry for rounded corners', () => {
    const { container } = render(<KeySvgRect {...defaultProps} />)
    const rect = container.querySelector('rect')
    expect(rect.getAttribute('rx')).toBe('2')
    expect(rect.getAttribute('ry')).toBe('2')
  })

  it('has round stroke linejoin', () => {
    const { container } = render(<KeySvgRect {...defaultProps} />)
    const rect = container.querySelector('rect')
    expect(rect.getAttribute('stroke-linejoin')).toBe('round')
  })
})
