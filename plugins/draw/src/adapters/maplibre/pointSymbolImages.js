import { symbolRegistry } from '../../../../../src/services/symbolRegistry.js'
import { getSymbolAnchor, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { anchorToMaplibre, anchorToMaplibreOffset } from '../../../../../providers/maplibre/src/utils/symbolImages.js'

/**
 * Resolves and registers a drawn point's symbol-config icon (the same schema addMarker
 * and dataset point features use — symbol/symbolSvgContent/symbolBackgroundColor/etc.,
 * see src/config/symbolConfig.js), and writes the resolved image id/anchor/offset back onto
 * the feature as properties (symbolImageId/symbolIconAnchor/symbolIconOffset) so the
 * data-driven point-symbol layer (styles.js's pointSymbol()) can render it via
 * icon-image/icon-anchor/icon-offset expressions.
 *
 * A point feature's own properties ARE already the "style" object symbolRegistry expects —
 * newPoint.js passes symbol config options straight through, no transformation needed.
 */

export const hasSymbolStyle = (properties) => !!(properties?.symbol || properties?.symbolSvgContent)

// map.getPixelRatio() is only ever set once, at map construction (MapController.jsx bakes
// window.devicePixelRatio * scaleFactor[mapSize] into the initMap() call) — nothing in this
// app updates it later purely from a map-size change. The one thing that DOES update the
// live pixel ratio is the app-wide MAP_SET_PIXEL_RATIO event (fired by the map-size UI
// alongside, but after, MAP_SET_SIZE — see mapboxDraw.js), whose payload is the freshly
// computed value itself — callers reacting to THAT event should pass it straight through as
// pixelRatioOverride rather than trusting map.getPixelRatio() to already reflect it.
export const getPixelRatio = (map) => map.getPixelRatio?.() || 1

/**
 * Resolve one point feature's symbol image and write it back onto the feature.
 * A no-op for points with no symbol config (nothing to render as an icon).
 *
 * @param {Object} params
 * @param {Object} params.draw - the raw MapboxDraw instance (needs get/add)
 * @param {Object} params.mapProvider - MapLibreProvider (needs addSymbolsToMap)
 * @param {Object} params.map - MapLibre map instance (needs _drawCurrentMapStyle, getPixelRatio)
 * @param {string} params.featureId
 * @param {Object} params.properties - the point feature's current properties
 * @param {number} [params.pixelRatioOverride] - use this instead of map.getPixelRatio(), for
 *   callers (map-size refresh) that already know the freshly computed value
 * @returns {Promise<void>}
 */
export const resolvePointSymbol = async ({ draw, mapProvider, map, featureId, properties, pixelRatioOverride }) => {
  if (!hasSymbolStyle(properties)) {
    return
  }

  const mapStyle = map._drawCurrentMapStyle
  const pixelRatio = pixelRatioOverride ?? getPixelRatio(map)

  try {
    await mapProvider.addSymbolsToMap([properties], mapStyle, symbolRegistry)

    // The feature may have been deleted/cancelled while registration was in flight.
    const feature = draw.get(featureId)
    if (!feature) {
      return
    }

    const symbolImageId = symbolRegistry.getSymbolImageId(properties, mapStyle, false, pixelRatio)
    if (!symbolImageId) {
      return
    }
    const symbolDef = symbolRegistry.getSymbolDef(properties)
    const rawAnchor = getSymbolAnchor(properties, symbolDef)
    const anchor = anchorToMaplibre(rawAnchor)
    // icon-anchor only has 9 discrete positions — pin's [0.5, 0.9] (and any other off-grid
    // anchor) loses precision snapping to one of them ('bottom', here). icon-offset corrects
    // it, so a drawn point lines up with the same anchor point a DOM marker using the same
    // symbol config would (SymbolMarker.jsx positions those with the exact fraction, no
    // snapping) — see anchorToMaplibreOffset's own comment for the maths.
    const offset = anchorToMaplibreOffset(rawAnchor, getSymbolViewBox(properties, symbolDef))

    // draw.setFeatureProperty() only marks the feature dirty for mapbox-gl-draw's own
    // internal mode-dispatch loop to pick up and render later — it never renders itself.
    // That loop only runs during an active interaction (a click, a drag...), so a property
    // written from here (outside any mode dispatch) would sit invisible until the next
    // unrelated interaction happened to trigger a render. draw.add() on an existing id
    // updates its properties AND calls store.render() unconditionally, so it's used here
    // instead — passing the full properties object (not just the new keys), since add()
    // replaces properties wholesale rather than merging.
    draw.add({
      ...feature,
      properties: { ...properties, symbolImageId, symbolIconAnchor: anchor, symbolIconOffset: offset }
    })
  } catch (err) {
    // A silent failure here means a point simply never gets/keeps an icon, with nothing in
    // the UI to explain why — surface it instead of letting the rejection vanish.
    console.error('[draw] failed to resolve point symbol', featureId, err) // NOSONAR
  }
}

/**
 * Re-resolve every existing drawn point's symbol — called on map style/pixel-ratio change,
 * since the rasterised image (colours, and pixel-ratio-scaled dimensions) depends on both.
 *
 * @param {Object} params
 * @param {Object} params.draw - the raw MapboxDraw instance (needs getAll)
 * @param {Object} params.mapProvider
 * @param {Object} params.map
 * @param {number} [params.pixelRatioOverride] - see resolvePointSymbol
 * @returns {Promise<void>}
 */
export const refreshAllPointSymbols = ({ draw, mapProvider, map, pixelRatioOverride }) => {
  const points = draw.getAll().features.filter(
    (f) => f.geometry.type === 'Point' && hasSymbolStyle(f.properties)
  )
  return Promise.all(points.map((f) =>
    resolvePointSymbol({ draw, mapProvider, map, featureId: f.id, properties: f.properties, pixelRatioOverride })
  ))
}
