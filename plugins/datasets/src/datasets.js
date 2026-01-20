import { handleSetMapStyle } from './handleSetMapStyle.js'
import { addMapLayers, getSourceId } from './mapLayers.js'

export const createDatasets = ({
  pluginConfig,
  pluginStateRef,
  mapStyleId,
  mapProvider,
  events,
  eventBus
}) => {
  const { map } = mapProvider
  const { datasets } = pluginConfig

  const getDatasets = () => pluginStateRef.current.datasets || datasets
  const getHiddenFeatures = () => pluginStateRef.current.hiddenFeatures || {}

  // Initialize all datasets once
  datasets.forEach(dataset => {
    addMapLayers(map, mapStyleId, dataset)
  })

  // Emit ready event once map has processed the layers
  map.once('idle', () => {
    eventBus.emit('datasets:ready')
  })

  // Handle style changes
  const styleHandler = handleSetMapStyle({
    map,
    events,
    eventBus,
    getDatasets,
    getHiddenFeatures
  })

  return {
    remove() {
      eventBus.off(events.MAP_SET_STYLE, styleHandler)

      const allDatasets = getDatasets()
      const removedSourceIds = new Set()

      // Clean up layers and sources
      allDatasets.forEach(dataset => {
        const sourceId = getSourceId(dataset)
        const fillLayerId = dataset.fill ? dataset.id : null
        const strokeLayerId = dataset.stroke ? (dataset.fill ? `${dataset.id}-stroke` : dataset.id) : null

        if (strokeLayerId && map.getLayer(strokeLayerId)) {
          map.removeLayer(strokeLayerId)
        }

        if (fillLayerId && map.getLayer(fillLayerId)) {
          map.removeLayer(fillLayerId)
        }

        // Only remove each shared source once
        if (!removedSourceIds.has(sourceId) && map.getSource(sourceId)) {
          map.removeSource(sourceId)
          removedSourceIds.add(sourceId)
        }
      })
    }
  }
}
