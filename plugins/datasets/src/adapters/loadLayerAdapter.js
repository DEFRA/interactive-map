const importLayerAdapter = async (mapProvider) => {
  switch (mapProvider.name) {
    case 'MapLibreProvider': {
      const { default: LayerAdapter } = await import(/* webpackChunkName: "im-datasets-ml-adapter" */ './maplibre/maplibreLayerAdapter.js')
      return LayerAdapter
    }
    // TODO: add cases for EsriProvider, OpenLayersProvider and potentially LeafletProvider
    default: {
      throw new Error(`No layer adapter available for map provider ${mapProvider.name}. Please provide a compatible layer adapter.`)
    }
  }
}

let _layerAdapter
export const layerAdapter = {}

export const loadLayerAdapter = async (mapProvider, symbolRegistry, patternRegistry) => {
  const LayerAdapter = await importLayerAdapter(mapProvider)
  _layerAdapter = new LayerAdapter(mapProvider, symbolRegistry, patternRegistry)

  // Assign the adapter methods that are consumed by the api
  layerAdapter.removeDataset = _layerAdapter.removeDataset.bind(_layerAdapter)
  layerAdapter.setData = _layerAdapter.setData.bind(_layerAdapter)
  layerAdapter.applyStyle = _layerAdapter.applyStyle.bind(_layerAdapter)
  layerAdapter.applyDatasetVisibility = _layerAdapter.applyDatasetVisibility.bind(_layerAdapter)
  layerAdapter.applyGlobalVisibility = _layerAdapter.applyGlobalVisibility.bind(_layerAdapter)
  layerAdapter.applyDatasetOpacity = _layerAdapter.applyDatasetOpacity.bind(_layerAdapter)
  layerAdapter.applyGlobalOpacity = _layerAdapter.applyGlobalOpacity.bind(_layerAdapter)
  layerAdapter.addDataset = _layerAdapter.addDataset.bind(_layerAdapter)
  layerAdapter.applyFeatureFilter = _layerAdapter.applyFeatureFilter.bind(_layerAdapter)

  return _layerAdapter
}
