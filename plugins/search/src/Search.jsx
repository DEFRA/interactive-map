// src/plugins/search/Search.jsx
import { useRef, useEffect } from 'react'
import { Form } from './components/Form/Form'
import { CloseButton } from './components/CloseButton/CloseButton'
import { SubmitButton } from './components/SubmitButton/SubmitButton'
import { createDatasets } from './datasets.js'
import { attachEvents } from './events/index.js'

export function Search ({ appConfig, iconRegistry, pluginState, pluginConfig, appState, mapState, services, mapProvider }) {
  const { id } = appConfig
  const { interfaceType } = appState
  const { expanded: defaultExpanded, customDatasets, osNamesURL, regions, maxSuggestions } = pluginConfig
  const { dispatch, isExpanded, areSuggestionsVisible, suggestions } = pluginState
  const closeIcon = iconRegistry.close
  const searchIcon = iconRegistry.search
  const searchContainerRef = useRef(null)
  const inputRef = useRef(null)
  const viewportRef = appState.layoutRefs.viewportRef

  // Build datasets array from default plus custom
  const mergedDatasets = createDatasets({
    customDatasets,
    osNamesURL,
    regions,
    maxSuggestions,
    crs: mapProvider.crs
  })

  // This ensures factory `attachEvents` only runs once
  const eventsRef = useRef(null)
  if (!eventsRef.current) {
    const { marker: markerOptions, ...restPluginConfig } = pluginConfig
    eventsRef.current = attachEvents({
      dispatch,
      datasets: mergedDatasets,
      services,
      mapProvider,
      viewportRef,
      searchContainerRef,
      markers: mapState.markers,
      markerOptions,
      ...restPluginConfig
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
      return undefined
    }

    // Disable clicks on the viewport while search is open
    viewportRef.current.style.pointerEvents = 'none'

    document.addEventListener('focusin', events.handleOutside)
    document.addEventListener('pointerdown', events.handleOutside)

    return () => {
      // Re-enable viewport pointer events when component unmounts
      viewportRef.current.style.pointerEvents = 'auto'
      document.removeEventListener('focusin', events.handleOutside)
      document.removeEventListener('pointerdown', events.handleOutside)
    }
  }, [isExpanded, interfaceType, areSuggestionsVisible, suggestions])

  // The form is only visible when expanded (or default-expanded). When collapsed the
  // trigger button (a separate slot item) is what shows, so keep this wrapper out of
  // layout — otherwise its empty box adds a stray flex gap in the slot column.
  const isFormVisible = defaultExpanded || isExpanded

  return (
    <div
      className={`im-c-search${isFormVisible ? '' : ' im-c-search--collapsed'}`}
      ref={searchContainerRef}
    >
      <Form
        id={id}
        pluginState={pluginState}
        pluginConfig={pluginConfig}
        appState={appState}
        inputRef={inputRef}
        events={events}
        services={services}
      >
        <CloseButton
          defaultExpanded={defaultExpanded}
          onClick={(e) => events.handleCloseClick(e, appState)}
          closeIcon={closeIcon}
        />
        <SubmitButton
          defaultExpanded={defaultExpanded}
          submitIcon={searchIcon}
        />
      </Form>
    </div>
  )
}
