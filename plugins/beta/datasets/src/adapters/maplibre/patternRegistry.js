import { hasPattern, getPatternImageId, rasterisePattern } from '../../styles/patterns.js'
import { mergeSublayer } from '../../utils/mergeSublayer.js'

/**
 * Collect all style configs that require a pattern image: top-level datasets
 * and any sublayers whose merged style has a pattern.
 * @param {Object[]} datasets
 * @returns {Object[]}
 */
const getPatternConfigs = (datasets) =>
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

/**
 * Register all required pattern images with the map.
 * Skips images that are already registered (safe to call on style change).
 * @param {Object} map - MapLibre map instance
 * @param {Object[]} datasets
 * @param {string} mapStyleId
 * @returns {Promise<void>}
 */
export const registerPatterns = async (map, datasets, mapStyleId) => {
  const patternConfigs = getPatternConfigs(datasets)
  if (!patternConfigs.length) {
    return
  }

  await Promise.all(patternConfigs.map(async (config) => {
    const imageId = getPatternImageId(config, mapStyleId)
    if (!imageId || map.hasImage(imageId)) {
      return
    }
    const result = await rasterisePattern(config, mapStyleId)
    if (result) {
      map.addImage(result.imageId, result.imageData, { pixelRatio: 2 })
    }
  }))
}
