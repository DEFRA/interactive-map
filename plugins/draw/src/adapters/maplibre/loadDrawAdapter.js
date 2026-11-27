// The MapLibre engine package's version of ../loadDrawAdapter.js: imports the adapter
// directly, so it's bundled with the plugin and no other engine is referenced
import { MaplibreDrawAdapter } from './MaplibreDrawAdapter.js'

export const loadDrawAdapter = async (mapProvider, options) => new MaplibreDrawAdapter(mapProvider, options)
