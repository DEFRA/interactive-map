import { render } from '@testing-library/react'
import { MapKeyInit } from './MapKeyInit.jsx'
import { setDatasetRegistry } from '../registry/getDatasetRegistry.js'

jest.mock('../registry/getDatasetRegistry.js', () => ({
  setDatasetRegistry: jest.fn()
}))

const eventBus = { requestOnce: jest.fn() }
const services = { eventBus }

beforeEach(() => {
  jest.clearAllMocks()
})

describe('MapKeyInit', () => {
  it('does not call requestOnce when map is not ready', () => {
    render(<MapKeyInit mapState={{ isMapReady: false }} services={services} />)
    expect(eventBus.requestOnce).not.toHaveBeenCalled()
  })

  it('calls requestOnce for datasets:registry when map is ready', () => {
    render(<MapKeyInit mapState={{ isMapReady: true }} services={services} />)
    expect(eventBus.requestOnce).toHaveBeenCalledWith('datasets:registry', setDatasetRegistry)
  })

  it('calls requestOnce when isMapReady changes to true', () => {
    const { rerender } = render(<MapKeyInit mapState={{ isMapReady: false }} services={services} />)
    expect(eventBus.requestOnce).not.toHaveBeenCalled()
    rerender(<MapKeyInit mapState={{ isMapReady: true }} services={services} />)
    expect(eventBus.requestOnce).toHaveBeenCalledTimes(1)
  })

  it('does not call requestOnce again on re-render when isMapReady stays true', () => {
    const { rerender } = render(<MapKeyInit mapState={{ isMapReady: true }} services={services} />)
    rerender(<MapKeyInit mapState={{ isMapReady: true }} services={services} />)
    expect(eventBus.requestOnce).toHaveBeenCalledTimes(1)
  })
})
