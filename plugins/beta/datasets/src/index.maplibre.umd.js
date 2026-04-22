import createDatasetsPlugin from './index.js'

/**
 * Combined datasets plugin + MapLibre layer adapter for UMD consumers.
 *
 * Bakes the MapLibre adapter in so UMD users need a single script tag and no
 * layerAdapter config. The adapter is still loaded lazily — it is only fetched
 * when the datasets plugin initialises, not on page load.
 *
 * Both the manifest and adapter chunks are in the same webpack compilation so
 * cross-runtime module resolution issues are avoided.
 *
 * @example
 * const plugin = defra.datasetsMaplibrePlugin({ datasets: [...] })
 */
export default function createDatasetsMaplibrePlugin (options = {}) {
  return createDatasetsPlugin({
    ...options,
    layerAdapter: {
      load: () => import(/* webpackChunkName: "im-datasets-maplibre-adapter" */ './adapters/maplibre/maplibreLayerAdapter.js')
    }
  })
}
