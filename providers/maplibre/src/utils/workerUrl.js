/**
 * Returns the URL of MapLibre's worker script.
 *
 * MapLibre looks for its worker next to its own module, which bundlers move and rename. Written as
 * a static `new URL(..., import.meta.url)` so webpack and Vite emit the worker file and rewrite this
 * URL to it. The version query stops browsers reusing a cached worker from another MapLibre release.
 *
 * @param {string} version - MapLibre version, from `getVersion()`.
 * @returns {string} The worker URL.
 */
export const getWorkerUrl = (version) => {
  const url = new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url)
  url.searchParams.set('v', version)
  return url.href
}
