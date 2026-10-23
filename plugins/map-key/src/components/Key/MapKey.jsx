import React, { useState, useEffect, useRef } from 'react'
import { mergeKeyGroupItems } from '../../reducers/mergeKeyGroupItems.js'
import { Key } from './Key.jsx'

export function MapKey ({
  mapState: { mapStyle },
  pluginConfig: { noKeyItemText },
  pluginState,
  services: { eventBus, symbolRegistry, patternRegistry }
}) {
  const { datasetRegistry } = pluginState
  // The event handlers below outlive the render that registers them, so they read the latest state
  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState
  // Lazily seed from the registry (already populated whenever the key is opened after
  // datasets:ready) so the first paint shows real content instead of flashing the empty
  // state while the effect below catches up on the next tick.
  const [keyGroups, setKeyGroups] = useState(() => datasetRegistry?.keyItems().items ?? [])
  const [hasGroups, setHasGroups] = useState(() => datasetRegistry?.keyItems().hasGroups ?? false)

  const getKeyItems = () => {
    const { items, hasGroups: _hasGroups } = datasetRegistry.keyItems()
    // Post Process the items - based on the map-key pluginConfig adding any groupConfigs
    const groupItems = mergeKeyGroupItems(items, pluginStateRef.current)
    setKeyGroups(groupItems)
    setHasGroups(_hasGroups)
  }

  const onMenuChanged = (menuState) => {
    datasetRegistry.invalidateKeyItemsOnMenuStateChange(menuState)
    getKeyItems()
  }

  useEffect(() => {
    // MapKeyInit puts the registry in plugin state once the datasets plugin is ready
    if (!datasetRegistry) {
      return undefined
    }
    getKeyItems() // populate the initial KeyItems from the datasetRegistry (which caches them)
    eventBus
      .on('menu:changed', onMenuChanged) // Ensure keyItems refresh when menu updates
      .on('datasets:changed', getKeyItems) // Ensure keyItems refresh when datasets change
    return () => eventBus
      .off('menu:changed', onMenuChanged)
      .off('datasets:changed', getKeyItems)
  }, [datasetRegistry])

  useEffect(() => {
    if (!datasetRegistry) {
      return
    }
    getKeyItems()
  }, [pluginState])

  return (
    <Key
      noKeyItemText={noKeyItemText}
      keyGroups={keyGroups}
      hasGroups={hasGroups}
      mapStyle={mapStyle}
      symbolRegistry={symbolRegistry}
      patternRegistry={patternRegistry}
    />
  )
}
