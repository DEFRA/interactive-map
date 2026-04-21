import MaplibreLayerAdapter from './maplibreLayerAdapter.js'

/**
 * UMD-specific adapter descriptor.
 *
 * Unlike the ESM entry, this bundles MaplibreLayerAdapter eagerly so it is
 * self-contained in a single file. Dynamic import() is not used because in a
 * multi-entry UMD build each entry has its own webpack runtime — lazy chunks
 * produced by one entry cannot be resolved by a different entry's runtime.
 *
 * load() returns a Promise that resolves immediately with the class, matching
 * the same interface as the ESM lazy-load version so DatasetsInit works
 * identically in both environments.
 */
export const maplibreLayerAdapter = {
  load: () => Promise.resolve({ default: MaplibreLayerAdapter })
}

export default maplibreLayerAdapter
