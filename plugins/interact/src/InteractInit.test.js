import { render } from '@testing-library/react'
import { EVENTS } from '../../../src/config/events.js'
import { InteractInit } from './InteractInit.jsx'
import { useInteractionHandlers } from './hooks/useInteractionHandlers.js'
import { useHighlightSync } from './hooks/useHighlightSync.js'
import { useHoverCursor } from './hooks/useHoverCursor.js'
import { useMapItemList } from './hooks/useMapItemList.js'

const LISTBOX_CAPABLE = 'interact:listboxcapable'

jest.mock('./hooks/useInteractionHandlers.js')
jest.mock('./hooks/useHighlightSync.js')
jest.mock('./hooks/useHoverCursor.js')
jest.mock('./hooks/useMapItemList.js')
jest.mock('./hooks/useCrossHairVisibility.js')
jest.mock('./hooks/useAttachEvents.js')

let props
let handleInteractionMock

beforeEach(() => {
  handleInteractionMock = jest.fn()

  useInteractionHandlers.mockReturnValue({ handleInteraction: handleInteractionMock })
  useHighlightSync.mockReturnValue(undefined)
  useHoverCursor.mockReturnValue(undefined)
  useMapItemList.mockReturnValue(undefined)

  props = {
    appState: { interfaceType: 'mouse', layoutRefs: { viewportRef: { current: document.createElement('div') }, appContainerRef: { current: document.createElement('div') } } },
    mapState: { crossHair: { fixAtCenter: jest.fn(), hide: jest.fn() }, mapStyle: {} },
    services: { eventBus: { emit: jest.fn() } },
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
    expect(capableProps.services.eventBus.emit).toHaveBeenCalledWith(LISTBOX_CAPABLE)
  })

  it('emits interact:listboxcapable when enabled with a labeled marker', () => {
    const capableProps = {
      ...props,
      mapState: { ...props.mapState, markers: { items: [{ id: 'm1', label: 'My marker' }] } },
      pluginState: { ...props.pluginState, interactionModes: ['selectMarker'] }
    }
    render(<InteractInit {...capableProps} />)
    expect(capableProps.services.eventBus.emit).toHaveBeenCalledWith(LISTBOX_CAPABLE)
  })

  it('does not emit interact:listboxcapable when disabled', () => {
    const disabledProps = {
      ...props,
      pluginState: { ...props.pluginState, enabled: false, interactionModes: ['selectFeature'], layers: [{ layerId: 'myLayer', labelProperty: 'name' }] }
    }
    render(<InteractInit {...disabledProps} />)
    expect(disabledProps.services.eventBus.emit).not.toHaveBeenCalledWith(LISTBOX_CAPABLE)
  })
})
