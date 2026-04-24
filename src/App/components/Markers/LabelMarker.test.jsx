import { render } from '@testing-library/react'
import LabelMarker from './LabelMarker.jsx'

const makeMarker = (overrides = {}) => ({ id: 'lbl-1', isVisible: true, label: 'Test Label', ...overrides })
const markerRef = () => () => {}

describe('LabelMarker', () => {
  it('renders the label text', () => {
    const { getByText } = render(<LabelMarker marker={makeMarker()} mapId='map' markerRef={markerRef} />)
    expect(getByText('Test Label')).toBeTruthy()
  })

  it('has wrapper id of mapId-marker-markerId', () => {
    const { container } = render(<LabelMarker marker={makeMarker()} mapId='my-map' markerRef={markerRef} />)
    expect(container.querySelector('.im-c-marker-wrapper').getAttribute('id')).toBe('my-map-marker-lbl-1')
  })

  it('has wrapper class im-c-marker-wrapper--label', () => {
    const { container } = render(<LabelMarker marker={makeMarker()} mapId='map' markerRef={markerRef} />)
    expect(container.querySelector('.im-c-marker-wrapper')).toHaveClass('im-c-marker-wrapper--label')
  })

  it('label element has role note and standalone class', () => {
    const { container } = render(<LabelMarker marker={makeMarker()} mapId='map' markerRef={markerRef} />)
    const label = container.querySelector('.im-c-marker__label--standalone')
    expect(label.getAttribute('role')).toBe('note')
  })

  it.each([
    [true, 'block'],
    [false, 'none']
  ])('display is %s when isVisible=%s', (isVisible, display) => {
    const { container } = render(<LabelMarker marker={makeMarker({ isVisible })} mapId='map' markerRef={markerRef} />)
    expect(container.querySelector('.im-c-marker-wrapper')).toHaveStyle({ display })
  })
})
