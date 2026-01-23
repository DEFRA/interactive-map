// src/plugins/search/Search.jsx
import { useRef, useEffect } from 'react'
import { OpenButton } from './components/OpenButton/OpenButton'
import { Form } from './components/Form/Form'
import { CloseButton } from './components/CloseButton/CloseButton'
import { createDatasets } from './datasets.js'
import { attachEvents } from './events/index.js'

export function Search({ appConfig, iconRegistry, pluginState, pluginConfig, appState, mapState, services, mapProvider }) {
  const { id } = appConfig
  const { interfaceType, breakpoint } = appState
  const { isExpanded: defaultExpanded, customDatasets, osNamesURL } = pluginConfig
  const { dispatch, isExpanded, areSuggestionsVisible, suggestions } = pluginState

  const closeIcon = iconRegistry['close']
  const searchIcon = iconRegistry['search']
  const searchContainerRef = useRef(null)
  const buttonRef = useRef(null)
  const inputRef = useRef(null)
  const closeButtonRef = useRef(null)
  const viewportRef = appState.layoutRefs.viewportRef

  // Build datasets array from default plus custom
  const mergedDatasets = createDatasets({
    customDatasets,
    osNamesURL,
    crs: mapProvider.crs
  })

  // This ensures factory `attachEvents` only runs once
  const eventsRef = useRef(null)
  if (!eventsRef.current) {
    eventsRef.current = attachEvents({
      dispatch,
      datasets: mergedDatasets,
      services,
      mapProvider,
      viewportRef,
      searchContainerRef,
      markers: mapState.markers,
      ...pluginConfig
    })
  }
  const events = eventsRef.current

  const searchOpen = isExpanded || !!(defaultExpanded && areSuggestionsVisible && suggestions.length)

  // Set initial focus
  useEffect(() => {
    if (!isExpanded) {
      return
    }
    inputRef.current?.focus()
  }, [isExpanded])

  // Manage focus outside the search control
  useEffect(() => {
    appState.dispatch({ type: 'TOGGLE_HAS_EXCLUSIVE_CONTROL', payload: isExpanded })

    if (!searchOpen) {
      return
    }

    // Disable clicks on the viewport while search is open
    viewportRef.current.style.pointerEvents = 'none'

    // Add focusin only for keyboard interaction and on mobile devices
    if (interfaceType === 'keyboard' && breakpoint === 'mobile' ) {
      document.addEventListener('focusin', events.handleOutside)
    }

    return () => {
      // Re-enable viewport pointer events when component unmounts
      viewportRef.current.style.pointerEvents = 'auto'

      // Remove focusin listener on unmount
      if (interfaceType === 'keyboard') {
        document.removeEventListener('focusin', events.handleOutside)
      }
    }
  }, [isExpanded, interfaceType, areSuggestionsVisible, suggestions])

  return (
    <div className="im-c-search" ref={searchContainerRef}>
      {!defaultExpanded && (
        <OpenButton
          id={id}
          isExpanded={isExpanded}
          onClick={() => events.handleOpenClick(appState)}
          buttonRef={buttonRef}
          searchIcon={searchIcon}
        />
      )}
      <Form
        id={id}
        pluginState={pluginState}
        pluginConfig={pluginConfig}
        appState={appState}
        inputRef={inputRef}
        events={events}
      >
        <CloseButton
          defaultExpanded={defaultExpanded}
          onClick={(e) => events.handleCloseClick(e, buttonRef, appState)}
          closeIcon={closeIcon}
          ref={closeButtonRef}
        />
      </Form>
    </div>
  )
}