// The OpenLayers engine package's version of ../loadDrawAdapter.js: imports the adapter
// directly, so it's bundled with the plugin and no other engine is referenced
import { OLDrawAdapter } from './OLDrawAdapter.js'

export const loadDrawAdapter = async (mapProvider, options) => new OLDrawAdapter(mapProvider, options)
