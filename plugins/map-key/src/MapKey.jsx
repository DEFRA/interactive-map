import React from 'react'
import { getDatasetRegistry } from './registry/getDatasetRegistry.js'

export function MapKey ({ mapState, pluginConfig }) {
  // console.log({ mapState, pluginConfig })
  const datasetRegistry = getDatasetRegistry()
  if (datasetRegistry) {
    console.log('datasetRegistry.keyItems ', datasetRegistry.keyItems())
  }
  return (
    <div className='im-c-map-key'>
      My Map Key Plugin
    </div>
  )
}
