import React, { useState, useEffect } from 'react'
import { getDatasetRegistry } from '../../registry/index.js'

import { Key } from './Key.jsx'

export function MapKey ({
  mapState: { mapStyle },
  pluginConfig: { noKeyItemText },
  services: { eventBus }
}) {
  const [keyGroups, setKeyGroups] = useState([])
  const [hasGroups, setHasGroups] = useState(false)
  const [datasetRegistry, setDatasetRegistry] = useState(getDatasetRegistry())

  const getKeyItems = () => {
    const { items, hasGroups: _hasGroups } = datasetRegistry.keyItems()
    setKeyGroups(items)
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
