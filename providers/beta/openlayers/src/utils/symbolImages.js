import { get as getIconImage } from 'ol/style/IconImage.js'
import ImageState from 'ol/ImageState.js'

/**
 * The OL "last mile" for symbolRegistry's rasterised symbol images: turns the ImageData
 * rasteriseSymbolImage() produces into something OL can render, cached by the same imageId
 * symbolRegistry computes. OL has no map-level image registry like MapLibre's map.addImage, so
 * the OL provider owns one of these per map instead (see OpenLayersProvider.addSymbolsToMap).
 *
 * Two shapes of the same image are kept: a <canvas> for styles that build an ol/style/Icon
 * directly (draw points, highlights), and a data URI for a flat style's icon-src (datasets).
 */
export class SymbolImageCache {
  images = new Map() // imageId → HTMLCanvasElement
  dataUris = new Map() // imageId → data URI string
  activeImageIds = new Map() // normal imageId → active imageId
  selectedImageIds = new Map() // normal imageId → selected imageId

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
      // time styles switch to new images, as on every map-size change.
      getIconImage(canvas, dataUri, undefined, ImageState.LOADED, null)
    }
  }

  /**
   * Rasterises and caches one symbol's normal, active and selected images, and maps its normal
   * imageId to the other two. Images already cached are reused.
   *
   * @param {Object} style - a symbol style (symbol/symbolSvgContent plus token overrides)
   * @param {Object} mapStyle - current map style config
   * @param {Object} symbolRegistry
   * @param {number} pixelRatio
   * @returns {Promise<void>}
   */
  async registerSymbol (style, mapStyle, symbolRegistry, pixelRatio) {
    const normalId = symbolRegistry.getSymbolImageId(style, mapStyle, false, pixelRatio)
    if (!normalId) {
      return
    }
    const activeId = symbolRegistry.getSymbolImageId(style, mapStyle, true, pixelRatio)
    this.activeImageIds.set(normalId, activeId)

    await Promise.all(['normal', 'active', 'selected'].map(async (variant) => {
      const knownId = { normal: normalId, active: activeId }[variant]
      if (knownId && this.images.has(knownId)) {
        return
      }
      const result = await symbolRegistry.rasteriseSymbolImage(style, mapStyle, variant, pixelRatio)
      if (!result) {
        return
      }
      if (variant === 'selected') {
        this.selectedImageIds.set(normalId, result.imageId)
      }
      if (!this.images.has(result.imageId)) {
        this.addImage(result.imageId, result.imageData, variant === 'normal')
      }
    }))
  }

  /**
   * Registers several symbols in parallel.
   *
   * @param {Object[]} styles
   * @param {Object} mapStyle
   * @param {Object} symbolRegistry
   * @param {number} pixelRatio
   * @returns {Promise<void>}
   */
  async registerSymbols (styles, mapStyle, symbolRegistry, pixelRatio) {
    await Promise.all(styles.map((style) => this.registerSymbol(style, mapStyle, symbolRegistry, pixelRatio)))
  }
}
