import { render } from '@testing-library/react'
import { MenuInit } from './MenuInit.jsx'
import { createMenu } from './createMenu.js'
import { updateUrl } from './updateUrl.js'

jest.mock('./createMenu.js', () => ({
  createMenu: jest.fn()
}))

jest.mock('./updateUrl.js', () => ({
  updateUrl: jest.fn()
}))

const mockRemove = jest.fn()
const mockDispatch = jest.fn()
const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn(), emitWhenRequested: jest.fn() }
const services = { eventBus }
const pluginState = { dispatch: mockDispatch, menuState: null }
const pluginConfig = { menu: [] }

beforeEach(() => {
  jest.clearAllMocks()
  createMenu.mockReturnValue(mockRemove)
})

describe('MenuInit', () => {
  it('does not call createMenu when map is not ready', () => {
    render(<MenuInit mapState={{ isMapReady: false }} services={services} pluginState={pluginState} pluginConfig={pluginConfig} />)
    expect(createMenu).not.toHaveBeenCalled()
  })

  it('calls createMenu with eventBus when map is ready', () => {
    render(<MenuInit mapState={{ isMapReady: true }} services={services} pluginState={pluginState} pluginConfig={pluginConfig} />)
    expect(createMenu).toHaveBeenCalledWith(expect.objectContaining({ eventBus }))
  })

  it('calls remove on unmount when map was ready', () => {
    const { unmount } = render(<MenuInit mapState={{ isMapReady: true }} services={services} pluginState={pluginState} pluginConfig={pluginConfig} />)
    unmount()
    expect(mockRemove).toHaveBeenCalled()
  })

  it('does not call remove on unmount when map was not ready', () => {
    const { unmount } = render(<MenuInit mapState={{ isMapReady: false }} services={services} pluginState={pluginState} pluginConfig={pluginConfig} />)
    unmount()
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('calls createMenu again when isMapReady changes to true', () => {
    const { rerender } = render(<MenuInit mapState={{ isMapReady: false }} services={services} pluginState={pluginState} pluginConfig={pluginConfig} />)
    expect(createMenu).not.toHaveBeenCalled()
    rerender(<MenuInit mapState={{ isMapReady: true }} services={services} pluginState={pluginState} pluginConfig={pluginConfig} />)
    expect(createMenu).toHaveBeenCalledTimes(1)
  })

  it('emits menu:changed with the current menu state', () => {
    const menuState = { datasets: 'floodZones' }
    render(<MenuInit mapState={{ isMapReady: true }} services={services} pluginState={{ ...pluginState, menuState }} pluginConfig={pluginConfig} />)
    expect(eventBus.emit).toHaveBeenCalledWith('menu:changed', menuState)
  })

  it('does not update the url before the url has been parsed', () => {
    render(<MenuInit mapState={{ isMapReady: false }} services={services} pluginState={pluginState} pluginConfig={pluginConfig} />)
    expect(updateUrl).not.toHaveBeenCalled()
  })

  it('updates the url when the menu state changes after the url has been parsed', () => {
    const { rerender } = render(<MenuInit mapState={{ isMapReady: true }} services={services} pluginState={pluginState} pluginConfig={pluginConfig} />)
    expect(updateUrl).not.toHaveBeenCalled()

    const changedState = { ...pluginState, menuState: { datasets: 'coastalErosion' } }
    rerender(<MenuInit mapState={{ isMapReady: true }} services={services} pluginState={changedState} pluginConfig={pluginConfig} />)
    expect(updateUrl).toHaveBeenCalledWith(changedState)
  })
})
