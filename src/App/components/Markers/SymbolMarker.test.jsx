import { render } from '@testing-library/react'
import SymbolMarker from './SymbolMarker.jsx'

const makeMarker = (overrides = {}) => ({ id: 'marker-1', isVisible: true, symbol: 'pin', ...overrides })
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

describe('SymbolMarker', () => {
  it('has id of mapId-marker-markerId', () => {
    const { container } = render(<SymbolMarker marker={makeMarker()} mapId='my-map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('svg').getAttribute('id')).toBe('my-map-marker-marker-1')
  })

  it('has role img', () => {
    const { container } = render(<SymbolMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('svg').getAttribute('role')).toBe('img')
  })

  it('aria-label uses marker.label', () => {
    const { container } = render(<SymbolMarker marker={makeMarker({ label: 'My location' })} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('svg').getAttribute('aria-label')).toBe('My location')
  })

  it('aria-label falls back to Map marker when no label', () => {
    const { container } = render(<SymbolMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('svg').getAttribute('aria-label')).toBe('Map marker')
  })

  it('applies shapeId class', () => {
    const { container } = render(<SymbolMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps({ shapeId: 'flag' })} />)
    expect(container.querySelector('svg')).toHaveClass('im-c-marker--flag')
  })

  it('adds selected class when isSelected', () => {
    const { container } = render(<SymbolMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('svg')).toHaveClass('im-c-marker--selected')
  })

  it('does not add selected class when not selected', () => {
    const { container } = render(<SymbolMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('svg')).not.toHaveClass('im-c-marker--selected')
  })

  it.each([
    [true, 'block'],
    [false, 'none']
  ])('display is %s when isVisible=%s', (isVisible, display) => {
    const { container } = render(<SymbolMarker marker={makeMarker({ isVisible })} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps()} />)
    expect(container.querySelector('svg')).toHaveStyle({ display })
  })

  it('sets width, height and viewBox from symbolProps', () => {
    const { container } = render(<SymbolMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps({ scaledWidth: 50, scaledHeight: 60, viewBox: '0 0 50 60' })} />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('50')
    expect(svg.getAttribute('height')).toBe('60')
    expect(svg.getAttribute('viewBox')).toBe('0 0 50 60')
  })

  it('sets marginLeft and marginTop from anchor and dimensions', () => {
    const { container } = render(<SymbolMarker marker={makeMarker()} mapId='map' markerRef={markerRef} isSelected={false} symbolProps={makeSymbolProps({ anchor: [0.5, 1], scaledWidth: 38, scaledHeight: 38 })} />)
    expect(container.querySelector('svg')).toHaveStyle({ marginLeft: '-19px', marginTop: '-38px' })
  })
})
