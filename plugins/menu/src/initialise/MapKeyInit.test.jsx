import { render } from '@testing-library/react'
import { MapKeyInit } from './MapKeyInit.jsx'
import { createMapKey } from './createMapKey.js'

jest.mock('./createMapKey.js', () => ({
  createMapKey: jest.fn()
}))

const mockRemove = jest.fn()
const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
const services = { eventBus }

beforeEach(() => {
  jest.clearAllMocks()
  createMapKey.mockReturnValue({ remove: mockRemove })
})

describe('MapKeyInit', () => {
  it('does not call createMapKey when map is not ready', () => {
    render(<MapKeyInit mapState={{ isMapReady: false }} services={services} />)
    expect(createMapKey).not.toHaveBeenCalled()
  })

  it('calls createMapKey with eventBus when map is ready', () => {
    render(<MapKeyInit mapState={{ isMapReady: true }} services={services} />)
    expect(createMapKey).toHaveBeenCalledWith({ eventBus })
  })

  it('calls remove on unmount when map was ready', () => {
    const { unmount } = render(<MapKeyInit mapState={{ isMapReady: true }} services={services} />)
    unmount()
    expect(mockRemove).toHaveBeenCalled()
  })

  it('does not call remove on unmount when map was not ready', () => {
    const { unmount } = render(<MapKeyInit mapState={{ isMapReady: false }} services={services} />)
    unmount()
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('calls createMapKey again when isMapReady changes to true', () => {
    const { rerender } = render(<MapKeyInit mapState={{ isMapReady: false }} services={services} />)
    expect(createMapKey).not.toHaveBeenCalled()
    rerender(<MapKeyInit mapState={{ isMapReady: true }} services={services} />)
    expect(createMapKey).toHaveBeenCalledTimes(1)
  })
})
