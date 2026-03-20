import { createDynamicSource } from './fetch/createDynamicSource.js'

const isDynamicSource = (dataset) =>
  typeof dataset.geojson === 'string' &&
  !!dataset.idProperty &&
  typeof dataset.transformRequest === 'function'

export const createDatasets = ({
  adapter,
  pluginConfig,
  pluginStateRef,
  mapStyleId,
  mapProvider,
  events,
  eventBus
}) => {
  const { datasets } = pluginConfig


  const dynamicSources = new Map()

  const getDatasets = () => pluginStateRef.current.datasets || datasets
  const getHiddenFeatures = () => pluginStateRef.current.hiddenFeatures || {}

  // Initialise all datasets via the adapter, then set up dynamic sources
  adapter.init(datasets, mapStyleId).then(() => {
    datasets.forEach(dataset => {
      if (!isDynamicSource(dataset)) return

      const dynamicSource = createDynamicSource({
        dataset,
        map: mapProvider.map,
        onUpdate: (datasetId, geojson) => adapter.setData(datasetId, geojson)
      })
      dynamicSources.set(dataset.id, dynamicSource)
    })

    eventBus.emit('datasets:ready')
  })

  // Handle basemap style changes — delegate entirely to the adapter
  const onSetStyle = (e) => {
    adapter.onStyleChange(getDatasets(), e.id, getHiddenFeatures(), dynamicSources)
  }

  eventBus.on(events.MAP_SET_STYLE, onSetStyle)

  return {
    remove () {
      eventBus.off(events.MAP_SET_STYLE, onSetStyle)
      dynamicSources.forEach(source => source.destroy())
      dynamicSources.clear()
      adapter.destroy(getDatasets())
    },

    refreshDataset (datasetId) {
      dynamicSources.get(datasetId)?.refresh()
    },

    clearDatasetCache (datasetId) {
      dynamicSources.get(datasetId)?.clear()
    },

    getFeatureCount (datasetId) {
      return dynamicSources.get(datasetId)?.getFeatureCount() ?? null
    }
  }
}
