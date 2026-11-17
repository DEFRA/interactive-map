import React from 'react'
import { render } from '@testing-library/react'
import { EVENTS } from '../../../src/config/events.js'
import { createEventBus } from '../../../src/services/eventBus.js'
import { MapLoadingInit } from './MapLoadingInit.jsx'

const renderInit = (pluginConfig = {}, eventBus = createEventBus()) => {
  const controller = {
    show: jest.fn(),
    dismiss: jest.fn(),
    destroy: jest.fn(),
    isShown: jest.fn(() => true)
  }
  const props = {
    pluginConfig: { controller, ...pluginConfig },
    services: { eventBus }
  }
  return { controller, eventBus, ...render(<MapLoadingInit {...props} />) }
}

describe('MapLoadingInit', () => {
  it('renders no UI', () => {
    const { container } = renderInit()
    expect(container.firstChild).toBeNull()
  })

  it('dismisses the overlay on map:firstidle', () => {
    const { controller, eventBus } = renderInit()
    eventBus.emit(EVENTS.MAP_FIRST_IDLE, {})
    expect(controller.dismiss).toHaveBeenCalledWith('firstidle')
  })

  it('shows the overlay on map:ready so a reloaded map is covered', () => {
    const { controller, eventBus } = renderInit()
    eventBus.emit(EVENTS.MAP_READY, {})
    expect(controller.show).toHaveBeenCalled()
  })

  it('dismisses on map:destroy', () => {
    const { controller, eventBus } = renderInit()
    eventBus.emit(EVENTS.MAP_DESTROY, { mapId: 'map' })
    expect(controller.dismiss).toHaveBeenCalledWith('destroy')
  })

  it('dismisses straight away when a preserved app reopens', () => {
    const { controller, eventBus } = renderInit()
    eventBus.emit(EVENTS.APP_OPENED, { statePreserved: true, isFullscreen: true })
    expect(controller.dismiss).toHaveBeenCalledWith('appopened')
  })

  it('leaves the overlay alone when a fresh app opens', () => {
    const { controller, eventBus } = renderInit()
    eventBus.emit(EVENTS.APP_OPENED, { statePreserved: false, isFullscreen: true })
    expect(controller.dismiss).not.toHaveBeenCalled()
  })

  it('leaves the overlay alone when app:opened has no payload', () => {
    const { controller, eventBus } = renderInit()
    eventBus.emit(EVENTS.APP_OPENED)
    expect(controller.dismiss).not.toHaveBeenCalled()
  })

  it('skips the firstidle dismissal when dismissOnFirstIdle is false', () => {
    const { controller, eventBus } = renderInit({ dismissOnFirstIdle: false })
    eventBus.emit(EVENTS.MAP_FIRST_IDLE, {})
    expect(controller.dismiss).not.toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    const { controller, eventBus, unmount } = renderInit()
    unmount()

    eventBus.emit(EVENTS.MAP_FIRST_IDLE, {})
    eventBus.emit(EVENTS.MAP_READY, {})
    eventBus.emit(EVENTS.MAP_DESTROY, {})
    eventBus.emit(EVENTS.APP_OPENED, { statePreserved: true })

    expect(controller.dismiss).not.toHaveBeenCalled()
    expect(controller.show).not.toHaveBeenCalled()
  })

  it('renders without a controller', () => {
    const { container } = render(
      <MapLoadingInit pluginConfig={{}} services={{ eventBus: createEventBus() }} />
    )
    expect(container.firstChild).toBeNull()
  })
})
