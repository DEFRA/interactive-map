/**
 * MapLibre layer adapter descriptor for the datasets plugin.
 *
 * Import this and pass it as `layerAdapter` in the datasets plugin config.
 * The adapter implementation is loaded lazily — it is only bundled and fetched
 * when the datasets plugin initialises, keeping the initial bundle lean.
 *
 * @example
 * import { maplibreLayerAdapter } from './plugins/beta/datasets/adapters/maplibre'
 *
 * datasetsPlugin({
 *   layerAdapter: maplibreLayerAdapter,
 *   datasets: [...]
 * })
 */
export const maplibreLayerAdapter = {
  load: () => import(/* webpackChunkName: "im-datasets-ml-adapter" */ './adapter.js')
}
