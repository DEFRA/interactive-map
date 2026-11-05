// Picks the adapter for the map provider at runtime. Engine packages replace this module at
// build time with their engine's version (for example ./openlayers/importLayerAdapter.js),
// so other engines are never referenced.
export const importLayerAdapter = async (mapProvider) => {
  switch (mapProvider.name) {
    case 'MapLibreProvider': {
      const { default: LayerAdapter } = await import(/* webpackChunkName: "im-datasets-ml-adapter" */ './maplibre/maplibreLayerAdapter.js')
      return LayerAdapter
    }
    case 'EsriProvider': {
      const { default: LayerAdapter } = await import(/* webpackChunkName: "im-datasets-esri-adapter" */ './esri/esriLayerAdapter.js')
      return LayerAdapter
    }
    case 'OpenLayersProvider': {
      const { default: LayerAdapter } = await import(/* webpackChunkName: "im-datasets-ol-adapter" */ './openlayers/openlayersLayerAdapter.js')
      return LayerAdapter
    }
    // Once ready, add a case for LeafletProvider
    default: {
      throw new Error(`No layer adapter available for map provider ${mapProvider.name}. Please provide a compatible layer adapter.`)
    }
  }
}
