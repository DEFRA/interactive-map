import React from 'react'
import { getDatasetRegistry } from '../../registry/index.js'

import { Key } from './Key.jsx'

export function MapKey ({
  mapState: { mapStyle },
  pluginConfig: { noKeyItemText }
}) {
  const datasetRegistry = getDatasetRegistry()
  const { items: keyGroups, hasGroups } = datasetRegistry.keyItems()
  return (
    <Key
      noKeyItemText={noKeyItemText}
      keyGroups={keyGroups}
      hasGroups={hasGroups}
      mapStyle={mapStyle}
    />
  )
}
