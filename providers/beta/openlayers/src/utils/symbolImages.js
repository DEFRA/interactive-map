import IconImage from 'ol/style/IconImage.js'
import { shared as iconImageCache } from 'ol/style/IconImageCache.js'
import ImageState from 'ol/ImageState.js'
import { RecentImageSets } from '../../../../../src/utils/recentImageSets.js'

/**
 * The OL "last mile" for symbolRegistry's rasterised symbol images: turns the ImageData
 * rasteriseSymbolImage() produces into something OL can render, cached by the same imageId
 * symbolRegistry computes. OL has no map-level image registry like MapLibre's map.addImage, so
 * the OL provider owns one of these per map instead (see OpenLayersProvider.addSymbolsToMap).
 *
 * Two shapes of the same image are kept: a <canvas> for styles that build an ol/style/Icon
 * directly (draw points, highlights), and a data URI for a flat style's icon-src (datasets).
 *
 * Images are kept for the current and previous map size and style; ones only older sizes and
 * styles used are dropped, so the cache doesn't build up as the map size or style changes.
 */
export class SymbolImageCache {
  images = new Map() // imageId → HTMLCanvasElement
  dataUris = new Map() // imageId → data URI string
  activeImageIds = new Map() // normal imageId → active imageId
  selectedImageIds = new Map() // normal imageId → selected imageId
  recentImageSets = new RecentImageSets()

  /** Synchronous lookup for style functions — undefined until the image has been registered. */
  getImage (imageId) {
    return this.images.get(imageId)
  }

  /** Synchronous lookup for a flat style's icon-src — undefined until the image has been registered. */
  getDataUri (imageId) {
    return this.dataUris.get(imageId)
  }

  /** A symbol's active (keyboard cursor) variant, from its normal imageId */
  getActiveImageId (normalId) {
    return this.activeImageIds.get(normalId) ?? null
  }

  /** A symbol's selected variant, from its normal imageId */
  getSelectedImageId (normalId) {
    return this.selectedImageIds.get(normalId) ?? null
  }

  addImage (imageId, imageData, withDataUri) {
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    canvas.getContext('2d').putImageData(imageData, 0, 0)
    this.images.set(imageId, canvas)
    if (withDataUri) {
      const dataUri = canvas.toDataURL()
      this.dataUris.set(imageId, dataUri)
      // Seed OL's icon cache with the already-drawn canvas under this data URI, so a flat
      // style's icon-src finds a loaded image straight away. Otherwise OL loads the data URI
      // asynchronously and draws nothing for that icon until it has — a visible flicker each
      // time styles switch to new images, as on every map-size change. Set rather than got, so
      // it also replaces an unloaded entry left by removeImage.
      iconImageCache.set(dataUri, null, new IconImage(canvas, dataUri, undefined, ImageState.LOADED, null))
    }
  }

  removeImage (imageId) {
    const dataUri = this.dataUris.get(imageId)
    this.dataUris.delete(imageId)
    // OL's icon cache would otherwise keep the canvas alive; an unloaded entry in its place holds
    // nothing, and OL's own cache limit can clear it. Two images can draw identical pixels, so
    // it's left alone while a kept image still has the same data URI.
    if (dataUri && !Array.from(this.dataUris.values()).includes(dataUri)) {
      iconImageCache.set(dataUri, null, new IconImage(undefined, dataUri, undefined, ImageState.IDLE, null))
    }
    this.images.delete(imageId)
    this.activeImageIds.delete(imageId)
    this.selectedImageIds.delete(imageId)
  }

  /**
   * Rasterises and caches one symbol's normal, active and selected images, and maps its normal
   * imageId to the other two. Images already cached are reused.
   *
   * @param {Object} style - a symbol style (symbol/symbolSvgContent plus token overrides)
   * @param {Object} mapStyle - current map style config
   * @param {Object} symbolRegistry
   * @param {number} pixelRatio
   * @returns {Promise<string[]>} the symbol's image ids
   */
  async registerSymbol (style, mapStyle, symbolRegistry, pixelRatio) {
    const imageIds = symbolRegistry.getSymbolImageIds(style, mapStyle, pixelRatio)
    if (!imageIds) {
      return []
    }
    this.activeImageIds.set(imageIds.normal, imageIds.active)
    this.selectedImageIds.set(imageIds.normal, imageIds.selected)

    await Promise.all(Object.entries(imageIds).map(async ([variant, imageId]) => {
      if (this.images.has(imageId)) {
        return
      }
      const result = await symbolRegistry.rasteriseSymbolImage(style, mapStyle, variant, pixelRatio)
      if (result && !this.images.has(result.imageId)) {
        this.addImage(result.imageId, result.imageData, variant === 'normal')
      }
    }))
    return Object.values(imageIds)
  }

  /**
   * Registers several symbols in parallel, then drops images only map sizes and styles older
   * than the previous one used.
   *
   * @param {Object[]} styles
   * @param {Object} mapStyle
   * @param {Object} symbolRegistry
   * @param {number} pixelRatio
   * @returns {Promise<void>}
   */
  async registerSymbols (styles, mapStyle, symbolRegistry, pixelRatio) {
    const imageIds = await Promise.all(styles.map((style) => this.registerSymbol(style, mapStyle, symbolRegistry, pixelRatio)))
    this.recentImageSets.add(`${mapStyle?.id}|${pixelRatio}`, imageIds.flat())
      .forEach((imageId) => this.removeImage(imageId))
  }
}
