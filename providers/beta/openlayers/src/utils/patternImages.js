import Fill from 'ol/style/Fill.js'
import { RecentImageSets } from '../../../../../src/utils/recentImageSets.js'

/**
 * The OpenLayers provider's pattern fills: each pattern image as an ol/style/Fill whose colour
 * is a CanvasPattern, cached by the imageId patternRegistry computes. A CanvasPattern built
 * straight from the pixelRatio-scaled image stays crisp at any pixel ratio, which a flat style's
 * fill-pattern-src can't — it crops the pattern to its display size rather than scaling it.
 *
 * Fills are kept for the current and previous map size and style; ones only older sizes and
 * styles used are dropped, so they don't build up as the map size or style changes.
 */
export class PatternImageCache {
  fills = new Map() // imageId → Fill
  recentImageSets = new RecentImageSets()

  /** Synchronous lookup for style functions — undefined until the pattern has been registered. */
  getFill (imageId) {
    return this.fills.get(imageId)
  }

  addFill (imageId, imageData) {
    const source = document.createElement('canvas')
    source.width = imageData.width
    source.height = imageData.height
    source.getContext('2d').putImageData(imageData, 0, 0)
    const pattern = document.createElement('canvas').getContext('2d').createPattern(source, 'repeat')
    this.fills.set(imageId, new Fill({ color: pattern }))
  }

  /**
   * Rasterises and caches each pattern's fill. Fills already cached are reused, and styles that
   * resolve to the same image are only rasterised once.
   *
   * @param {Object[]} styles - pattern style configs (fillPattern/fillPatternSvgContent plus colours)
   * @param {string} mapStyleId
   * @param {Object} patternRegistry
   * @param {number} pixelRatio
   * @returns {Promise<void>}
   */
  async registerPatterns (styles, mapStyleId, patternRegistry, pixelRatio) {
    const stylesByImageId = new Map()
    styles.forEach((style) => {
      const imageId = patternRegistry.getPatternImageId(style, mapStyleId, pixelRatio)
      if (imageId && !stylesByImageId.has(imageId)) {
        stylesByImageId.set(imageId, style)
      }
    })
    await Promise.all(Array.from(stylesByImageId, async ([imageId, style]) => {
      if (this.fills.has(imageId)) {
        return
      }
      const result = await patternRegistry.rasterisePatternImage(style, mapStyleId, pixelRatio)
      if (result && !this.fills.has(result.imageId)) {
        this.addFill(result.imageId, result.imageData)
      }
    }))
    this.recentImageSets.add(`${mapStyleId}|${pixelRatio}`, Array.from(stylesByImageId.keys()))
      .forEach((imageId) => this.fills.delete(imageId))
  }
}
