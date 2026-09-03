import React, { useState, useEffect } from 'react'
import { getDatasetRegistry } from '../../registry/index.js'
import { mergeKeyGroupItems } from '../../utils/mergeKeyGroupItems.js'
import { Key } from './Key.jsx'

export function MapKey ({
  mapState: { mapStyle },
  pluginConfig: { noKeyItemText, groups },
  services: { eventBus }
}) {
  const [datasetRegistry, setDatasetRegistry] = useState(getDatasetRegistry())
  // Lazily seed from the registry (already populated whenever the key is opened after
  // datasets:ready) so the first paint shows real content instead of flashing the empty
  // state while the effect below catches up on the next tick.
  const [keyGroups, setKeyGroups] = useState(() => datasetRegistry?.keyItems().items ?? [])
  const [hasGroups, setHasGroups] = useState(() => datasetRegistry?.keyItems().hasGroups ?? false)

  const getKeyItems = () => {
    const { items, hasGroups: _hasGroups } = datasetRegistry.keyItems()
    // Post Process the items - based on the map-key pluginConfig adding any groupConfigs
    const groupItems = mergeKeyGroupItems(groups, items)
    setKeyGroups(groupItems)
    setHasGroups(_hasGroups)
  }

  const onMenuChanged = (menuState) => {
    datasetRegistry.invalidateKeyItemsOnMenuStateChange(menuState)
    getKeyItems()
  }

  useEffect(() => {
    if (!datasetRegistry) {
      // 'datasets:registry' is only required when the key is opened before datasets:ready
      eventBus.requestOnce('datasets:registry', setDatasetRegistry)
      return () => {}
    } else {
      getKeyItems() // populate the initial KeyItems from the datasetRegistry (which caches them)
      eventBus
        .on('menu:changed', onMenuChanged) // Ensure keyItems refresh when menu updates
        .on('datasets:changed', getKeyItems) // Ensure keyItems refresh when datasets change
      return () => eventBus
        .off('menu:changed', onMenuChanged)
        .off('datasets:changed', getKeyItems)
    }
  }, [datasetRegistry])

  return (
    <Key
      noKeyItemText={noKeyItemText}
      keyGroups={keyGroups}
      hasGroups={hasGroups}
      mapStyle={mapStyle}
    />
  )
}
