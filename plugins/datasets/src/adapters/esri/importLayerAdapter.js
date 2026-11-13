// The Esri engine package's version of ../importLayerAdapter.js: imports the adapter
// directly, so it's bundled with the plugin and no other engine is referenced
import LayerAdapter from './esriLayerAdapter.js'

export const importLayerAdapter = async () => LayerAdapter
