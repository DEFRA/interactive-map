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

// The path getWorkerUrl()'s URL keeps when a bundler hasn't rewritten it (Rollup and esbuild don't)
const UNBUNDLED_WORKER_PATH = /\/maplibre-gl\/dist\/maplibre-gl-worker\.mjs$/

/**
 * Whether a worker URL from getWorkerUrl() was left as written by the bundler, so points at a file
 * that was never copied into the build.
 *
 * @param {string} url - The worker URL.
 * @returns {boolean} true if the worker wasn't included in the build.
 */
export const isUnbundledWorkerUrl = (url) => UNBUNDLED_WORKER_PATH.test(new URL(url).pathname)
