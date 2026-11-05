// Picks the adapter for the map provider at runtime. Engine packages replace this module at
// build time with their engine's version (for example ./openlayers/loadDrawAdapter.js),
// so other engines are never referenced.
export const loadDrawAdapter = async (mapProvider, options) => {
  switch (mapProvider.name) {
    case 'MapLibreProvider': {
      const { MaplibreDrawAdapter } = await import(/* webpackChunkName: "im-draw-ml-adapter" */ './maplibre/MaplibreDrawAdapter.js')
      return new MaplibreDrawAdapter(mapProvider, options)
    }
    case 'OpenLayersProvider': {
      const { OLDrawAdapter } = await import(/* webpackChunkName: "im-draw-ol-adapter" */ './openlayers/OLDrawAdapter.js')
      return new OLDrawAdapter(mapProvider, options)
    }
    default:
      throw new Error(`No draw adapter available for map provider "${mapProvider.name}"`)
  }
}
