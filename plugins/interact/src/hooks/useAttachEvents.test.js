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
    mapState: { mapStyle: {}, crossHair: { getDetail: jest.fn(() => ({ point: {}, coords: [] })) } },
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

  describe('crossHair.activate — re-wired whenever mapState.crossHair is replaced', () => {
    it('wires crossHair.activate on mount, calling handleInteraction with the live getDetail() result', () => {
      renderHook(() => useAttachEvents(props))
      expect(typeof props.mapState.crossHair.activate).toBe('function')

      props.mapState.crossHair.activate()
      expect(handleInteractionMock).toHaveBeenCalledWith({ point: {}, coords: [] })
    })

    it('re-wires onto a new crossHair object — mapReducer.js replaces it wholesale on every UPDATE_CROSS_HAIR dispatch', () => {
      const { rerender } = renderHook((p) => useAttachEvents(p), { initialProps: props })
      const staleCrossHair = props.mapState.crossHair

      const nextProps = { ...props, mapState: { ...props.mapState, crossHair: { getDetail: jest.fn(() => ({ point: {}, coords: [] })) } } }
      rerender(nextProps)

      expect(staleCrossHair.activate).toBeNull() // guarded cleanup nulled the old one
      expect(typeof nextProps.mapState.crossHair.activate).toBe('function')
    })

    it('nulls activate on unmount, guarded — leaves a newer owner alone', () => {
      const { unmount } = renderHook(() => useAttachEvents(props))
      const ownActivate = props.mapState.crossHair.activate
      expect(typeof ownActivate).toBe('function')

      unmount()
      expect(props.mapState.crossHair.activate).toBeNull()
    })

    it('does not wire crossHair.activate when the plugin is not enabled', () => {
      renderHook(() => useAttachEvents({ ...props, pluginState: { enabled: false } }))
      expect(props.mapState.crossHair.activate).toBeUndefined()
    })

    it('leaves a newer owner\'s crossHair.activate alone on unmount — guarded, not unconditional', () => {
      const { unmount } = renderHook(() => useAttachEvents(props))
      const laterOwnersActivate = () => {}
      props.mapState.crossHair.activate = laterOwnersActivate
      unmount()
      expect(props.mapState.crossHair.activate).toBe(laterOwnersActivate)
    })
  })
})
