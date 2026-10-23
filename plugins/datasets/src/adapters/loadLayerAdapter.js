import { importLayerAdapter } from './importLayerAdapter.js'

export const loadLayerAdapter = async (mapProvider, symbolRegistry, patternRegistry, datasetRegistry) => {
  const LayerAdapter = await importLayerAdapter(mapProvider)
  return new LayerAdapter(mapProvider, symbolRegistry, patternRegistry, datasetRegistry)
}
