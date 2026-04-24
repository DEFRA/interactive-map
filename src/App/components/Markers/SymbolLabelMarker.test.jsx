import { render } from '@testing-library/react'
import SymbolLabelMarker from './SymbolLabelMarker.jsx'

const makeMarker = (overrides = {}) => ({ id: 'marker-1', isVisible: true, symbol: 'pin', label: 'Test', ...overrides })
const markerRef = () => () => {}
const makeSymbolProps = (overrides = {}) => ({
  resolvedSvg: '<circle/>',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
  shapeId: 'pin',
  scaledWidth: 38,
  scaledHeight: 38,
  ...overrides
})

describe('SymbolLabelMarker', () => {
  it('renders the label text', () => {
    const { getByText } = render(<SymbolLabelMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(getByText('Test')).toBeTruthy()
  })

  it('has wrapper id of mapId-marker-markerId', () => {
    const { container } = render(<SymbolLabelMarker marker={makeMarker()} mapId='my-map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('.im-c-marker-wrapper').getAttribute('id')).toBe('my-map-marker-marker-1')
  })

  it('applies shapeId to wrapper and svg class names', () => {
    const { container } = render(<SymbolLabelMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps({ shapeId: 'flag' })} />)
    expect(container.querySelector('.im-c-marker-wrapper')).toHaveClass('im-c-marker-wrapper--flag')
    expect(container.querySelector('svg')).toHaveClass('im-c-marker--flag')
  })

  it('adds selected classes to wrapper and svg when isSelected', () => {
    const { container } = render(<SymbolLabelMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('.im-c-marker-wrapper')).toHaveClass('im-c-marker-wrapper--selected')
    expect(container.querySelector('svg')).toHaveClass('im-c-marker--selected')
  })

  it('svg is aria-hidden', () => {
    const { container } = render(<SymbolLabelMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('svg').getAttribute('aria-hidden')).toBe('true')
  })

  it('label element has role note', () => {
    const { container } = render(<SymbolLabelMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('.im-c-marker__label').getAttribute('role')).toBe('note')
  })

  it.each([
    [true, 'block'],
    [false, 'none']
  ])('display is %s when isVisible=%s', (isVisible, display) => {
    const { container } = render(<SymbolLabelMarker marker={makeMarker({ isVisible })} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('.im-c-marker-wrapper')).toHaveStyle({ display })
  })
})
