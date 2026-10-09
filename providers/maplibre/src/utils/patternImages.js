import { getEffectivePixelRatio } from '../../../../src/utils/patternUtils.js'
import { RecentImageSets } from '../../../../src/utils/recentImageSets.js'

/**
 * The MapLibre provider's pattern images, in the map's own image store (map.addImage). One per
 * map, shared by every caller that registers patterns on it. Images are kept for the current and
 * previous map size and style; ones only older sizes and styles used are removed from the map,
 * so they don't build up as the map size or style changes.
 */
export class PatternImages {
  recentImageSets = new RecentImageSets()

  /** @param {Object} map - MapLibre map instance */
  constructor (map) {
    this.map = map
  }

  /**
   * Rasterises and adds each pattern's image to the map. Images the map already has are reused,
   * and styles that resolve to the same image are only rasterised once.
   *
   * @param {Object[]} styleArray - pattern style configs (fillPattern/fillPatternSvgContent plus colours)
   * @param {string} mapStyleId
   * @param {Object} patternRegistry
   * @param {number} pixelRatio - Device pixel ratio × map size scale factor
   * @returns {Promise<void>}
   */
  async registerPatterns (styleArray, mapStyleId, patternRegistry, pixelRatio) {
    const { map } = this
    const stylesByImageId = new Map()
    styleArray.forEach((style) => {
      const imageId = patternRegistry.getPatternImageId(style, mapStyleId, pixelRatio)
      if (imageId && !stylesByImageId.has(imageId)) {
        stylesByImageId.set(imageId, style)
      }
    })
    const effectiveRatio = getEffectivePixelRatio(pixelRatio)
    await Promise.all(Array.from(stylesByImageId, async ([imageId, style]) => {
      if (map.hasImage(imageId)) {
        return
      }
      const result = await patternRegistry.rasterisePatternImage(style, mapStyleId, pixelRatio)
      if (result && !map.hasImage(result.imageId)) {
        map.addImage(result.imageId, result.imageData, { pixelRatio: effectiveRatio })
      }
    }))
    this.recentImageSets.add(`${mapStyleId}|${pixelRatio}`, Array.from(stylesByImageId.keys()))
      .forEach((imageId) => {
        if (map.hasImage(imageId)) {
          map.removeImage(imageId)
        }
      })
  }
}
