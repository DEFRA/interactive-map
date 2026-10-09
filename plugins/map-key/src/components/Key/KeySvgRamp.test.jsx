import { render } from '@testing-library/react'
import { KeySvgRamp } from './KeySvgRamp'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'

jest.mock('../../../../../src/utils/getValueForStyle.js', () => ({
  getValueForStyle: jest.fn()
}))

const mapStyle = { id: 'outdoor' }
const fillKeyDefinition = { style: { fill: { outdoor: '#3d9', dark: '#1a5' }, stroke: '#123' } }
const patternKeyDefinition = {
  hasPattern: true,
  style: { fillPattern: 'dot', fillPatternForegroundColor: '#2E7D32' }
}
const patternRegistry = {
  getKeyPatternPaths: jest.fn(() => ({ border: '<path/>', content: '<path d="M0 0h1v1H0z" fill="#2E7D32"/>' }))
}

beforeEach(() => {
  jest.clearAllMocks()
  getValueForStyle.mockImplementation((value) =>
    typeof value === 'object' ? value.outdoor : value
  )
})

const renderRamp = (keyDefinition) =>
  render(<KeySvgRamp mapStyle={mapStyle} keyDefinition={keyDefinition} patternRegistry={patternRegistry} />)

describe('KeySvgRamp', () => {
  it('renders an svg without a viewBox, so the band stretches without distortion', () => {
    const { container } = renderRamp(fillKeyDefinition)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('viewBox')).toBeNull()
    expect(svg.getAttribute('class')).toBe('im-c-map-key-symbol')
  })

  it('fills the rect with the resolved fill and strokes it with the resolved stroke', () => {
    const { container } = renderRamp(fillKeyDefinition)
    const rect = container.querySelector('rect')
    expect(rect.getAttribute('fill')).toBe('#3d9')
    expect(rect.getAttribute('stroke')).toBe('#123')
    expect(rect.getAttribute('stroke-width')).toBe('4')
  })

  it('omits the stroke when none is resolved', () => {
    const { container } = renderRamp({ style: { fill: '#3d9' } })
    const rect = container.querySelector('rect')
    expect(rect.getAttribute('stroke')).toBeNull()
    expect(rect.getAttribute('stroke-width')).toBeNull()
  })

  it('fills the rect with a userSpaceOnUse pattern tile when the item has a pattern', () => {
    const { container } = renderRamp(patternKeyDefinition)
    const pattern = container.querySelector('pattern')
    const rect = container.querySelector('rect')
    expect(patternRegistry.getKeyPatternPaths).toHaveBeenCalledWith(patternKeyDefinition.style, 'outdoor')
    expect(pattern.getAttribute('patternUnits')).toBe('userSpaceOnUse')
    expect(pattern.getAttribute('width')).toBe('16')
    expect(pattern.querySelector('path')).toBeTruthy()
    expect(rect.getAttribute('fill')).toBe(`url(#${pattern.id})`)
  })

  it('draws no stroke on a pattern without a stroke', () => {
    const { container } = renderRamp(patternKeyDefinition)
    expect(container.querySelector('rect').getAttribute('stroke')).toBeNull()
  })

  it('gives each band its own pattern id', () => {
    const { container } = render(
      <>
        <KeySvgRamp mapStyle={mapStyle} keyDefinition={patternKeyDefinition} patternRegistry={patternRegistry} />
        <KeySvgRamp mapStyle={mapStyle} keyDefinition={patternKeyDefinition} patternRegistry={patternRegistry} />
      </>
    )
    const [a, b] = container.querySelectorAll('pattern')
    expect(a.id).not.toBe(b.id)
  })

  it('uses no fill when neither a fill nor a pattern is set', () => {
    const { container } = renderRamp({ style: { stroke: '#123' } })
    expect(container.querySelector('rect').getAttribute('fill')).toBe('none')
  })
})
