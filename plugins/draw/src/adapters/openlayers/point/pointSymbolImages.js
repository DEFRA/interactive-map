import { symbolRegistry } from '../../../../../../src/services/symbolRegistry.js'
import { getOrCreateSymbolImage } from '../../../../../../providers/beta/openlayers/src/utils/symbolImages.js'

/**
 * Resolves a drawn point's symbol-config icon and writes the resolved image id back onto the
 * OL feature, so core/styles.js's createFeatureStyle() can render it via an ol/style/Icon.
 * Also resolves and caches the 'active'/'selected' variants as symbolActiveImageId/
 * symbolSelectedImageId, read directly by highlightFeatures.js's selection overlay.
 */

const VARIANTS = ['normal', 'active', 'selected']
const PROPERTY_FOR_VARIANT = { normal: 'symbolImageId', active: 'symbolActiveImageId', selected: 'symbolSelectedImageId' }

export const hasSymbolStyle = (properties) => !!(properties?.symbol || properties?.symbolSvgContent)

// Combines the browser's native devicePixelRatio with this app's own map-size scale factor
// (mapProvider.drawScale), matching MapController.jsx's construction-time formula.
export const getPixelRatio = (mapProvider) => (globalThis.devicePixelRatio || 1) * (mapProvider?.drawScale ?? 1)

/**
 * Resolve one point feature's symbol image and write it back onto the feature.
 * A no-op for points with no symbol config (nothing to render as an icon).
 *
 * @param {Object} params
 * @param {Object} params.manager - OLDrawManager (needs store.source, mapStyle)
 * @param {Object} params.mapProvider
 * @param {import('ol/Feature.js').default} params.olFeature
 * @returns {Promise<void>}
 */
export const resolvePointSymbol = async ({ manager, mapProvider, olFeature }) => {
  const properties = olFeature.getProperties()
  if (!hasSymbolStyle(properties)) {
    return
  }

  const pixelRatio = getPixelRatio(mapProvider)

  try {
    const results = await Promise.all(
      VARIANTS.map((variant) => symbolRegistry.rasteriseSymbolImage(properties, manager.mapStyle, variant, pixelRatio))
    )
    // All three variants resolve from the same symbol config, so either all succeed or (an
    // unresolvable symbol id) all fail together — gating on 'normal' alone is enough.
    if (!results[0]) {
      return
    }

    // The feature may have been deleted/cancelled while rasterising was in flight.
    if (!manager.store.source.hasFeature(olFeature)) {
      return
    }
    VARIANTS.forEach((variant, i) => {
      const result = results[i]
      if (!result) { return }
      getOrCreateSymbolImage(result.imageId, result.imageData)
      olFeature.set(PROPERTY_FOR_VARIANT[variant], result.imageId)
    })
    // ol/style/Icon draws its source canvas at native pixel size — core/styles.js reads this
    // back to apply `scale: 1 / symbolPixelRatio`, correcting for the canvas being rasterised
    // at pixelRatio device pixels for crispness.
    olFeature.set('symbolPixelRatio', pixelRatio)
  } catch (err) {
    // A silent failure here means a point simply never gets/keeps an icon, with nothing in
    // the UI to explain why — surface it instead of letting the rejection vanish.
    console.error('[draw] failed to resolve point symbol', olFeature.getId(), err) // NOSONAR
  }
}

/**
 * Re-resolve every existing drawn point's symbol — called on map style/size change, since
 * the rasterised image (colours, and pixel-ratio-scaled dimensions) depends on both.
 *
 * @param {Object} params
 * @param {Object} params.manager
 * @param {Object} params.mapProvider
 * @returns {Promise<void>}
 */
export const refreshAllPointSymbols = ({ manager, mapProvider }) => {
  const points = manager.store.source.getFeatures().filter(
    (f) => f.getGeometry()?.getType() === 'Point' && hasSymbolStyle(f.getProperties())
  )
  return Promise.all(points.map((olFeature) => resolvePointSymbol({ manager, mapProvider, olFeature })))
}
