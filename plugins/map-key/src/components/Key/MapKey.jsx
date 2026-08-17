import React from 'react'
import { getDatasetRegistry, patternRegistry, symbolRegistry } from '../../registry/index.js'

import { Key } from './Key.jsx'

export function MapKey ({
  mapState: { mapStyle },
  pluginConfig: { noKeyItemText }
}) {
  // console.log({ mapState, pluginConfig })
  const datasetRegistry = getDatasetRegistry()
  const { items: keyGroups, hasGroups } = datasetRegistry.keyItems()
  const services = { symbolRegistry, patternRegistry }
  // if (datasetRegistry) {
  //   console.log('datasetRegistry.keyItems ', datasetRegistry.keyItems())
  // }
  return (
    <Key
      noKeyItemText={noKeyItemText}
      keyGroups={keyGroups}
      hasGroups={hasGroups}
      mapStyle={mapStyle}
      services={services}
    />
  )
}
