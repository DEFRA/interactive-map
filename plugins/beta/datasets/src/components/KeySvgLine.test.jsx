import { render } from '@testing-library/react'
import { KeySvgLine } from './KeySvgLine'

import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'

jest.mock('../../../../../src/utils/getValueForStyle', () => ({
  getValueForStyle: jest.fn((value) => value)
}))

const defaultProps = {
  stroke: '#ff0000',
  strokeWidth: 2,
  mapStyle: { id: 'default' }
}

beforeEach(() => {
  getValueForStyle.mockImplementation((value) => value)
})

describe('KeySvgLine', () => {
  it('renders an svg element', () => {
    const { container } = render(<KeySvgLine {...defaultProps} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders a line element', () => {
    const { container } = render(<KeySvgLine {...defaultProps} />)
    expect(container.querySelector('line')).toBeTruthy()
  })

  it('applies the stroke color via getValueForStyle', () => {
    render(<KeySvgLine {...defaultProps} />)
    expect(getValueForStyle).toHaveBeenCalledWith('#ff0000', 'default')
  })

  it('sets stroke attribute on the line', () => {
    const { container } = render(<KeySvgLine {...defaultProps} />)
    const line = container.querySelector('line')
    expect(line.getAttribute('stroke')).toBe('#ff0000')
  })

  it('sets strokeWidth attribute on the line', () => {
    const { container } = render(<KeySvgLine {...defaultProps} />)
    const line = container.querySelector('line')
    expect(line.getAttribute('stroke-width')).toBe('2')
  })

  it('centres the line vertically', () => {
    const { container } = render(<KeySvgLine {...defaultProps} />)
    const line = container.querySelector('line')
    expect(line.getAttribute('y1')).toBe('10')
    expect(line.getAttribute('y2')).toBe('10')
  })

  it('insets the line horizontally by half the strokeWidth', () => {
    const { container } = render(<KeySvgLine {...defaultProps} />)
    const line = container.querySelector('line')
    expect(line.getAttribute('x1')).toBe('1') // strokeWidth/2 = 1
    expect(line.getAttribute('x2')).toBe('19') // 20 - 1
  })

  it('has round stroke linecap', () => {
    const { container } = render(<KeySvgLine {...defaultProps} />)
    const line = container.querySelector('line')
    expect(line.getAttribute('stroke-linecap')).toBe('round')
  })
})
