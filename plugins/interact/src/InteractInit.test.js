import { act, render } from '@testing-library/react'
import { EVENTS } from '../../../src/config/events.js'
import { InteractInit } from './InteractInit.jsx'
import { useInteractionHandlers } from './hooks/useInteractionHandlers.js'
import { useHighlightSync } from './hooks/useHighlightSync.js'
import { useHoverCursor } from './hooks/useHoverCursor.js'
import { useMapItemList } from './hooks/useMapItemList.js'
import { attachEvents } from './events.js'
import { getInterfaceType } from '../../../src/utils/detectInterfaceType.js'

jest.mock('./hooks/useInteractionHandlers.js')
jest.mock('./hooks/useHighlightSync.js')
jest.mock('./hooks/useHoverCursor.js')
jest.mock('./hooks/useMapItemList.js')
jest.mock('./events.js')
jest.mock('../../../src/utils/detectInterfaceType.js', () => ({
  getInterfaceType: jest.fn(() => 'mouse'),
  subscribeToInterfaceChangesImmediate: jest.fn(() => () => {})
}))

let props
let handleInteractionMock
let cleanupMock

beforeEach(() => {
  handleInteractionMock = jest.fn()
  cleanupMock = jest.fn()

  useInteractionHandlers.mockReturnValue({ handleInteraction: handleInteractionMock })
  useHighlightSync.mockReturnValue(undefined)
  useHoverCursor.mockReturnValue(undefined)
  useMapItemList.mockReturnValue(undefined)
  attachEvents.mockReturnValue(cleanupMock)

  getInterfaceType.mockReturnValue('mouse')

  props = {
    appState: { interfaceType: 'mouse', layoutRefs: { viewportRef: { current: document.createElement('div') }, appContainerRef: { current: document.createElement('div') } } },
    mapState: { crossHair: { fixAtCenter: jest.fn(), hide: jest.fn() }, mapStyle: {} },
    services: { eventBus: { emit: jest.fn() }, closeApp: jest.fn() },
    buttonConfig: {},
    mapProvider: { setHoverCursor: jest.fn() },
    pluginState: {
      dispatch: jest.fn(),
      enabled: true,
      selectedFeatures: [],
      selectedMarkers: [],
      selectionBounds: {},
      interactionModes: ['selectFeature'],
      layers: []
    }
  }
})

describe('InteractInit — hook delegation', () => {
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
})

describe('InteractInit — crossHair and event attachment', () => {
  it('skips listbox focus listeners when appContainerRef is null', () => {
    props.appState.layoutRefs.appContainerRef = { current: null }
    render(<InteractInit {...props} />)
    expect(props.mapState.crossHair.hide).toHaveBeenCalled()
  })

  it('shows crossHair on touch/keyboard and hides when listbox has focus', () => {
    const container = props.appState.layoutRefs.appContainerRef.current
    getInterfaceType.mockReturnValue('touch')
    render(<InteractInit {...props} />)

    // Touch interface — fixAtCenter without requiring viewport focus
    expect(props.mapState.crossHair.fixAtCenter).toHaveBeenCalled()

    // Focus moves into listbox — hide
    const listboxEl = document.createElement('div')
    listboxEl.setAttribute('role', 'listbox')
    container.appendChild(listboxEl)
    act(() => listboxEl.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(props.mapState.crossHair.hide).toHaveBeenCalled()

    // Second focusin still inside listbox — no-op (state unchanged)
    const listboxEl2 = document.createElement('div')
    listboxEl2.setAttribute('role', 'listbox')
    container.appendChild(listboxEl2)
    act(() => listboxEl2.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(props.mapState.crossHair.hide).toHaveBeenCalledTimes(1)

    // Focus moves back out of listbox — show again
    const otherEl = document.createElement('div')
    container.appendChild(otherEl)
    act(() => otherEl.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(props.mapState.crossHair.fixAtCenter).toHaveBeenCalledTimes(2)
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
    expect(getAppState()).toBe(props.appState)
    expect(getPluginState()).toMatchObject({ enabled: props.pluginState.enabled })

    handleInteraction({ point: {}, coords: [] })
    expect(handleInteractionMock).toHaveBeenCalled()

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
    const disabledProps = { ...props, pluginState: { ...props.pluginState, enabled: false } }
    attachEvents.mockClear()
    render(<InteractInit {...disabledProps} />)
    expect(attachEvents).not.toHaveBeenCalled()
  })
})

describe('InteractInit — event bus emissions', () => {
  it('emits interact:active with active state and interactionModes on enable', () => {
    render(<InteractInit {...props} />)
    expect(props.services.eventBus.emit).toHaveBeenCalledWith('interact:active', {
      active: true,
      interactionModes: props.pluginState.interactionModes
    })
  })

  it('emits interact:listboxcapable when enabled with a feature layer that has a labelProperty', () => {
    const capableProps = {
      ...props,
      pluginState: { ...props.pluginState, interactionModes: ['selectFeature'], layers: [{ layerId: 'myLayer', labelProperty: 'name' }] }
    }
    render(<InteractInit {...capableProps} />)
    expect(capableProps.services.eventBus.emit).toHaveBeenCalledWith('interact:listboxcapable')
  })

  it('emits interact:listboxcapable when enabled with a labeled marker', () => {
    const capableProps = {
      ...props,
      mapState: { ...props.mapState, markers: { items: [{ id: 'm1', label: 'My marker' }] } },
      pluginState: { ...props.pluginState, interactionModes: ['selectMarker'] }
    }
    render(<InteractInit {...capableProps} />)
    expect(capableProps.services.eventBus.emit).toHaveBeenCalledWith('interact:listboxcapable')
  })
})
