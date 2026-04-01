// Re-export pure pattern utilities from core — no map engine dependency.
import { hasPattern } from '../../../../../../src/utils/patternUtils.js'
import { mergeSublayer } from '../../utils/mergeSublayer.js'

export { hasPattern, getPatternInnerContent, getPatternImageId, getKeyPatternPaths, injectColors } from '../../../../../../src/utils/patternUtils.js'

/**
 * Returns a flat list of datasets and merged sublayers that require pattern images.
 * Handles sublayer merging so callers (e.g. mapProvider.registerPatterns) receive ready-to-use configs.
 *
 * @param {Object[]} datasets
 * @param {Object} patternRegistry
 * @returns {Object[]}
 */
export const getPatternConfigs = (datasets, patternRegistry) =>
  datasets.flatMap(dataset => {
    const configs = hasPattern(dataset) ? [dataset] : []
    if (dataset.sublayers?.length) {
      dataset.sublayers.forEach(sublayer => {
        const merged = mergeSublayer(dataset, sublayer)
        if (hasPattern(merged)) {
          configs.push(merged)
        }
      })
    }
    return configs
  })
