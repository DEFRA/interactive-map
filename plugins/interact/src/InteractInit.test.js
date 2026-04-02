import { act, render } from '@testing-library/react'
import { EVENTS } from '../../../src/config/events.js'
import { InteractInit } from './InteractInit.jsx'
import { useInteractionHandlers } from './hooks/useInteractionHandlers.js'
import { useHighlightSync } from './hooks/useHighlightSync.js'
import { attachEvents } from './events.js'

jest.mock('./hooks/useInteractionHandlers.js')
jest.mock('./hooks/useHighlightSync.js')
jest.mock('./events.js')

describe('InteractInit', () => {
  let props
  let handleInteractionMock
  let cleanupMock

  beforeEach(() => {
    handleInteractionMock = jest.fn()
    cleanupMock = jest.fn()

    useInteractionHandlers.mockReturnValue({ handleInteraction: handleInteractionMock })
    useHighlightSync.mockReturnValue(undefined)
    attachEvents.mockReturnValue(cleanupMock)

    props = {
      appState: { interfaceType: 'mouse' },
      mapState: { crossHair: { fixAtCenter: jest.fn(), hide: jest.fn() }, mapStyle: {} },
      services: { eventBus: {}, closeApp: jest.fn() },
      buttonConfig: {},
      mapProvider: {},
      pluginState: { dispatch: jest.fn(), enabled: true, selectedFeatures: [], selectionBounds: {} }
    }
  })

  it('calls useInteractionHandlers with correct arguments', () => {
    render(<InteractInit {...props} />)
    expect(useInteractionHandlers).toHaveBeenCalledWith(expect.objectContaining({
      appState: props.appState,
      mapState: props.mapState,
      pluginState: props.pluginState,
      services: props.services,
      mapProvider: props.mapProvider
    }))
  })

  it('calls useHighlightSync with correct arguments', () => {
    render(<InteractInit {...props} />)
    expect(useHighlightSync).toHaveBeenCalledWith(expect.objectContaining({
      mapProvider: props.mapProvider,
      mapStyle: props.mapState.mapStyle,
      pluginState: props.pluginState,
      selectedFeatures: props.pluginState.selectedFeatures,
      dispatch: props.pluginState.dispatch,
      events: EVENTS,
      eventBus: props.services.eventBus
    }))
  })

  it('fixes or hides crossHair based on interfaceType and enabled', () => {
    // enabled true + non-touch = hide
    render(<InteractInit {...props} />)
    expect(props.mapState.crossHair.hide).toHaveBeenCalled()
    expect(props.mapState.crossHair.fixAtCenter).not.toHaveBeenCalled()

    // touch interface
    props.appState.interfaceType = 'touch'
    render(<InteractInit {...props} />)
    expect(props.mapState.crossHair.fixAtCenter).toHaveBeenCalled()
  })

  it('attaches events and returns cleanup', () => {
    const { unmount } = render(<InteractInit {...props} />)
    expect(attachEvents).toHaveBeenCalledWith(expect.objectContaining({
      getAppState: expect.any(Function),
      getPluginState: expect.any(Function),
      handleInteraction: expect.any(Function),
      mapState: props.mapState,
      buttonConfig: props.buttonConfig,
      events: EVENTS,
      eventBus: props.services.eventBus,
      closeApp: props.services.closeApp
    }))

    const { getAppState, getPluginState, handleInteraction } = attachEvents.mock.calls.at(-1)[0]
    expect(getAppState()).toMatchObject(props.appState)
    expect(getPluginState()).toMatchObject({ enabled: props.pluginState.enabled })

    const event = { point: {}, coords: [] }
    handleInteraction(event)
    expect(handleInteractionMock).toHaveBeenCalledWith(event)

    unmount()
    expect(cleanupMock).toHaveBeenCalled()
  })

  it('enables click handling after a macrotask', () => {
    jest.useFakeTimers()
    render(<InteractInit {...props} />)
    act(() => jest.runAllTimers())
    jest.useRealTimers()
  })

  it('does not attach events if plugin not enabled', () => {
    const disabledProps = {
      ...props,
      pluginState: { ...props.pluginState, enabled: false } // fresh object
    }
    attachEvents.mockClear() // ensure previous calls don't interfere
    render(<InteractInit {...disabledProps} />)
    expect(attachEvents).not.toHaveBeenCalled()
  })
})
