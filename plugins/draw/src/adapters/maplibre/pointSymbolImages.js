import { symbolRegistry } from '../../../../../src/services/symbolRegistry.js'
import { getSymbolAnchor, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { anchorToMaplibre, anchorToMaplibreOffset } from '../../../../../providers/maplibre/src/utils/symbolImages.js'

/**
 * Resolves and registers a drawn point's symbol-config icon (the same schema addMarker
 * and dataset point features use — symbol/symbolSvgContent/symbolBackgroundColor/etc.,
 * see src/config/symbolConfig.js), and writes the resolved image id/anchor/offset back onto
 * the feature as properties (symbolImageId/symbolIconAnchor/symbolIconOffset) so the
 * data-driven point-symbol layer (styles.js's pointSymbol()) can render it via
 * icon-image/icon-anchor/icon-offset expressions. Also writes symbolActiveImageId/
 * symbolSelectedImageId (the keyboard-cursor and click-selected variants of the same icon)
 * so providers/maplibre/src/utils/highlightFeatures.js's selection ring can reference each
 * point's own precomputed variant directly, since icon-image here is a per-feature
 * data-driven expression rather than the single static id a dataset layer uses.
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
 * @param {Object} params.store - { get(id), write(feature) } — a point can be committed (its
 *   own layer group) or mid-edit (mapbox-gl-draw's own store) by the time this settles, so
 *   reads/writes must go wherever the feature currently actually is; see
 *   MaplibreDrawAdapter.js's _pointStore.
 * @param {Object} params.mapProvider - MapLibreProvider (needs addSymbolsToMap)
 * @param {Object} params.map - MapLibre map instance (needs _drawCurrentMapStyle, getPixelRatio)
 * @param {string} params.featureId
 * @param {Object} params.properties - the point feature's current properties
 * @param {number} [params.pixelRatioOverride] - use this instead of map.getPixelRatio(), for
 *   callers (map-size refresh) that already know the freshly computed value
 * @returns {Promise<void>}
 */
export const resolvePointSymbol = async ({ store, mapProvider, map, featureId, properties, pixelRatioOverride }) => {
  if (!hasSymbolStyle(properties)) {
    return
  }

  const mapStyle = map._drawCurrentMapStyle
  const pixelRatio = pixelRatioOverride ?? getPixelRatio(map)

  try {
    await mapProvider.addSymbolsToMap([properties], mapStyle, symbolRegistry)

    // The feature may have been deleted/cancelled while registration was in flight.
    const feature = store.get(featureId)
    if (!feature) {
      return
    }

    const symbolImageId = symbolRegistry.getSymbolImageId(properties, mapStyle, false, pixelRatio)
    if (!symbolImageId) {
      return
    }
    // addSymbolsToMap() (just awaited above) already registered and mapped the active/selected
    // variants for this exact symbolImageId into map._activeSymbolImageMap/
    // _selectedSymbolImageMap — read them back rather than re-deriving, so a drawn point's
    // highlight (providers/maplibre/src/utils/highlightFeatures.js) can reference its own
    // precomputed id directly instead of reverse-mapping through those maps at highlight time
    // (which breaks once icon-image is a per-feature data-driven expression, as it is here).
    const symbolActiveImageId = map._activeSymbolImageMap?.[symbolImageId] ?? null
    const symbolSelectedImageId = map._selectedSymbolImageMap?.[symbolImageId] ?? null
    const symbolDef = symbolRegistry.getSymbolDef(properties)
    const rawAnchor = getSymbolAnchor(properties, symbolDef)
    const anchor = anchorToMaplibre(rawAnchor)
    // icon-anchor only has 9 discrete positions — pin's [0.5, 0.9] (and any other off-grid
    // anchor) loses precision snapping to one of them ('bottom', here). icon-offset corrects
    // it, so a drawn point lines up with the same anchor point a DOM marker using the same
    // symbol config would (SymbolMarker.jsx positions those with the exact fraction, no
    // snapping) — see anchorToMaplibreOffset's own comment for the maths.
    const offset = anchorToMaplibreOffset(rawAnchor, getSymbolViewBox(properties, symbolDef))

    // store.write() re-renders unconditionally (setData for a committed feature, draw.add()
    // for a mid-edit one) — passing the full properties object (not just the new keys), since
    // both write paths replace properties wholesale rather than merging.
    store.write({
      ...feature,
      properties: {
        ...properties,
        symbolImageId,
        symbolIconAnchor: anchor,
        symbolIconOffset: offset,
        symbolActiveImageId,
        symbolSelectedImageId
      }
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
 * @param {Object} params.store - { get(id), getAll(), write(feature) } — see resolvePointSymbol
 * @param {Object} params.mapProvider
 * @param {Object} params.map
 * @param {number} [params.pixelRatioOverride] - see resolvePointSymbol
 * @returns {Promise<void>}
 */
export const refreshAllPointSymbols = ({ store, mapProvider, map, pixelRatioOverride }) => {
  const points = store.getAll().filter(
    (f) => f.geometry.type === 'Point' && hasSymbolStyle(f.properties)
  )
  return Promise.all(points.map((f) =>
    resolvePointSymbol({ store, mapProvider, map, featureId: f.id, properties: f.properties, pixelRatioOverride })
  ))
}
