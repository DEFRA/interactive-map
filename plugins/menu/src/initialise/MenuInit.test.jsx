import { render } from '@testing-library/react'
import { MenuInit } from './MenuInit.jsx'
import { createMenu } from './createMenu.js'

jest.mock('./createMenu.js', () => ({
  createMenu: jest.fn()
}))

const mockRemove = jest.fn()
const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
const services = { eventBus }

beforeEach(() => {
  jest.clearAllMocks()
  createMenu.mockReturnValue({ remove: mockRemove })
})

describe('MenuInit', () => {
  it('does not call createMenu when map is not ready', () => {
    render(<MenuInit mapState={{ isMapReady: false }} services={services} />)
    expect(createMenu).not.toHaveBeenCalled()
  })

  it('calls createMenu with eventBus when map is ready', () => {
    render(<MenuInit mapState={{ isMapReady: true }} services={services} />)
    expect(createMenu).toHaveBeenCalledWith({ eventBus })
  })

  it('calls remove on unmount when map was ready', () => {
    const { unmount } = render(<MenuInit mapState={{ isMapReady: true }} services={services} />)
    unmount()
    expect(mockRemove).toHaveBeenCalled()
  })

  it('does not call remove on unmount when map was not ready', () => {
    const { unmount } = render(<MenuInit mapState={{ isMapReady: false }} services={services} />)
    unmount()
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('calls createMenu again when isMapReady changes to true', () => {
    const { rerender } = render(<MenuInit mapState={{ isMapReady: false }} services={services} />)
    expect(createMenu).not.toHaveBeenCalled()
    rerender(<MenuInit mapState={{ isMapReady: true }} services={services} />)
    expect(createMenu).toHaveBeenCalledTimes(1)
  })
})
