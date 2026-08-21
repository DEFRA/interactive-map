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

  // Get the initial keyItems, and ensure they are refreshed if the menu plugin state changes
  useEffect(() => {
    const datasetRegistry = getDatasetRegistry()

    const getKeyItems = () => {
      const { items, hasGroups: _hasGroups } = datasetRegistry ? datasetRegistry.keyItems() : { items: [], hasGroups: false }
      setKeyGroups(items)
      setHasGroups(_hasGroups)
    }
    // populate the initial KeyItems from the datasetRegistry (which caches them)
    getKeyItems()

    // Ensure the keyItems are invalidated and refreshed when the menuChanges
    const onMenuChanged = (menuState) => {
      datasetRegistry.invalidateKeyItemsOnMenuStateChange(menuState)
      getKeyItems()
    }
    eventBus.on('menu:changed', onMenuChanged)
    return () => eventBus.off('menu:changed', onMenuChanged)
  }, [])

  return (
    <Key
      noKeyItemText={noKeyItemText}
      keyGroups={keyGroups}
      hasGroups={hasGroups}
      mapStyle={mapStyle}
    />
  )
}
