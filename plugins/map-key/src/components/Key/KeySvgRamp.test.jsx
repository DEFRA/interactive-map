import { render } from '@testing-library/react'
import { KeySvgRamp } from './KeySvgRamp'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'

jest.mock('../../../../../src/utils/getValueForStyle.js', () => ({
  getValueForStyle: jest.fn()
}))

const mapStyle = { id: 'outdoor' }
const keyDefinition = { style: { fill: { outdoor: '#3d9', dark: '#1a5' } } }

beforeEach(() => {
  getValueForStyle.mockImplementation((value) =>
    typeof value === 'object' ? value.outdoor : value
  )
})

describe('KeySvgRamp', () => {
  it('renders an svg element', () => {
    const { container } = render(<KeySvgRamp mapStyle={mapStyle} keyDefinition={keyDefinition} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('passes the resolved fill to the svg', () => {
    const { container } = render(<KeySvgRamp mapStyle={mapStyle} keyDefinition={keyDefinition} />)
    expect(container.querySelector('svg').getAttribute('fill')).toBe('#3d9')
  })

  it('passes the resolved stroke to the svg', () => {
    const { container } = render(<KeySvgRamp mapStyle={mapStyle} keyDefinition={keyDefinition} />)
    expect(container.querySelector('svg').getAttribute('stroke')).toBe('#3d9')
  })

  it('uses preserveAspectRatio none', () => {
    const { container } = render(<KeySvgRamp mapStyle={mapStyle} keyDefinition={keyDefinition} />)
    expect(container.querySelector('svg').getAttribute('preserveAspectRatio')).toBe('none')
  })

  it('renders a path child', () => {
    const { container } = render(<KeySvgRamp mapStyle={mapStyle} keyDefinition={keyDefinition} />)
    expect(container.querySelector('path')).toBeTruthy()
  })
})
