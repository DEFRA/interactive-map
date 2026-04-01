// Re-export pure symbol resolution utilities from core — no map engine dependency.
import { hasSymbol } from '../../../../../../src/symbols/symbolUtils.js'
import { mergeSublayer } from '../../utils/mergeSublayer.js'

export { hasSymbol, getSymbolDef, getSymbolStyleColors, getSymbolViewBox, getSymbolAnchor } from '../../../../../../src/symbols/symbolUtils.js'

// Re-export MapLibre-specific symbol utilities from the provider.
// This is the single cross-boundary import in the adapter; in a separate-package
// setup this would be: '@interactive-map/maplibre-provider/utils/symbolImages'
export { anchorToMaplibre, getSymbolImageId } from '../../../../../../providers/maplibre/src/utils/symbolImages.js'

/**
 * Returns a flat list of datasets and merged sublayers that require symbol images.
 * Handles sublayer merging so callers (e.g. mapProvider.registerSymbols) receive ready-to-use configs.
 *
 * @param {Object[]} datasets
 * @returns {Object[]}
 */
export const getSymbolConfigs = (datasets) =>
  datasets.flatMap(dataset => {
    const configs = hasSymbol(dataset) ? [dataset] : []
    if (dataset.sublayers?.length) {
      dataset.sublayers.forEach(sublayer => {
        const merged = mergeSublayer(dataset, sublayer)
        if (hasSymbol(merged)) {
          configs.push(merged)
        }
      })
    }
    return configs
  })
