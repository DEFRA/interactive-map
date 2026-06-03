import { act, renderHook } from '@testing-library/react'
import { useAttachEvents } from './useAttachEvents.js'
import { attachEvents } from '../events.js'
import { EVENTS } from '../../../../src/config/events.js'

jest.mock('../events.js')

let props
let cleanupMock
let handleInteractionMock

beforeEach(() => {
  jest.clearAllMocks()
  cleanupMock = jest.fn()
  handleInteractionMock = jest.fn()
  attachEvents.mockReturnValue(cleanupMock)

  props = {
    pluginState: { enabled: true },
    appState: { interfaceType: 'mouse' },
    mapState: { mapStyle: {} },
    buttonConfig: {},
    eventBus: { emit: jest.fn() },
    handleInteraction: handleInteractionMock
  }
})

describe('useAttachEvents', () => {
  it('attaches events and returns cleanup', () => {
    const { unmount } = renderHook(() => useAttachEvents(props))
    expect(attachEvents).toHaveBeenCalledWith(expect.objectContaining({
      getAppState: expect.any(Function),
      getPluginState: expect.any(Function),
      handleInteraction: expect.any(Function),
      mapState: props.mapState,
      buttonConfig: props.buttonConfig,
      events: EVENTS,
      eventBus: props.eventBus
    }))

    const { getAppState, getPluginState, handleInteraction } = attachEvents.mock.calls.at(-1)[0]
    expect(getAppState()).toBe(props.appState)
    expect(getPluginState()).toMatchObject({ enabled: props.pluginState.enabled })

    handleInteraction({ point: {}, coords: [] })
    expect(handleInteractionMock).toHaveBeenCalled()

    unmount()
    expect(cleanupMock).toHaveBeenCalled()
  })

  it('enables click handling after a macrotask', () => {
    jest.useFakeTimers()
    renderHook(() => useAttachEvents(props))
    const { clickReadyRef } = attachEvents.mock.calls[0][0]
    expect(clickReadyRef.current).toBe(false)
    act(() => jest.runAllTimers())
    expect(clickReadyRef.current).toBe(true)
    jest.useRealTimers()
  })

  it('does not attach events if plugin not enabled', () => {
    renderHook(() => useAttachEvents({ ...props, pluginState: { enabled: false } }))
    expect(attachEvents).not.toHaveBeenCalled()
  })
})
