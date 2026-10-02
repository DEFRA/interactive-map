// src/plugins/search/Search.jsx
import { useRef, useEffect, useLayoutEffect } from 'react'
import { Form } from './components/Form/Form'
import { CloseButton } from './components/CloseButton/CloseButton'
import { SubmitButton } from './components/SubmitButton/SubmitButton'
import { createDatasets } from './datasets.js'
import { attachEvents } from './events/index.js'
import { APPLICATION_MODE_ID } from './defaults.js'

export function Search ({ appConfig, iconRegistry, pluginState, pluginConfig, appState, mapState, services, mapProvider, setApplicationMode, clearApplicationMode }) {
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

  // Enters the 'search' application mode while expanded, so search.scss can hide the rest of the
  // interface (with opacity, keeping it focusable for Tab-out), and leaves it on collapse or unmount.
  // useLayoutEffect (not useEffect) so the class lands in the same paint as the form expanding -
  // otherwise the browser paints once with the other buttons still visible, producing a flicker.
  useLayoutEffect(() => {
    if (!isExpanded) {
      return undefined
    }
    setApplicationMode(APPLICATION_MODE_ID)
    return () => clearApplicationMode(APPLICATION_MODE_ID)
  }, [isExpanded])

  // Manage focus outside the search control
  useLayoutEffect(() => {
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

  // Visible when expanded (or default-expanded); otherwise the trigger button in its own
  // slot is what shows, so this wrapper stays out of layout to avoid an empty stray gap.
  const isFormVisible = defaultExpanded || isExpanded

  return (
    <div // NOSONAR - not interactive itself: only catches Tab from its focusable children to continue tab order from the search button
      className={`im-c-search${isFormVisible ? '' : ' im-c-search--collapsed'}`}
      ref={searchContainerRef}
      onKeyDown={(event) => events.handleTabOut(event, appState.buttonRefs)}
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
