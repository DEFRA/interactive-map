import { symbolRegistry } from '../../../../../src/services/symbolRegistry.js'
import { getSymbolAnchor, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { anchorToMaplibre, anchorToMaplibreOffset } from '../../../../../providers/maplibre/src/utils/symbolImages.js'

/**
 * Resolves and registers a drawn point's symbol-config icon (the same schema addMarker and
 * dataset point features use — see src/config/symbolConfig.js), writing the resolved image
 * id/anchor/active-variant/selected-variant back onto the feature so the data-driven
 * point-symbol layer (styles.js's pointSymbol()) can render it. icon-offset is handled
 * separately (see registerSymbolIconOffset below) since it can't safely be a per-feature
 * property.
 *
 * A point feature's own properties ARE already the "style" object symbolRegistry expects —
 * newPoint.js passes symbol config options straight through, no transformation needed.
 */

export const hasSymbolStyle = (properties) => !!(properties?.symbol || properties?.symbolSvgContent)

const POINT_SYMBOL_LAYER_ID = 'point-symbol'

// icon-offset can't be a raw per-feature `get` on an array property — MapLibre's GeoJSON
// sources silently JSON.stringify arrays/objects, so it reads back a string at render time
// and MapLibre logs a type warning (see styles.js's pointSymbol() comment). Offset only
// depends on a symbolImageId's own anchor/viewBox, so instead each id's offset is folded into
// a `match` expression keyed on the (safe, string) user_symbolImageId property.
const buildIconOffsetExpression = (offsetsByImageId) => {
  const expression = ['match', ['get', 'user_symbolImageId']]
  for (const [imageId, offset] of Object.entries(offsetsByImageId)) {
    expression.push(imageId, ['literal', offset])
  }
  expression.push(['literal', [0, 0]]) // fallback for any id not yet registered
  return expression
}

const registerSymbolIconOffset = (map, symbolImageId, offset) => {
  map._symbolIconOffsetMap ??= {}
  if (map._symbolIconOffsetMap[symbolImageId]) {
    return // offset is deterministic per id — already registered, nothing changed
  }
  map._symbolIconOffsetMap[symbolImageId] = offset
  const expression = buildIconOffsetExpression(map._symbolIconOffsetMap)
  ;['hot', 'cold'].forEach((suffix) => {
    const layerId = `${POINT_SYMBOL_LAYER_ID}.${suffix}`
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'icon-offset', expression)
    }
  })
}

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
    // icon-anchor only has 9 discrete positions, so an off-grid anchor (e.g. pin's [0.5, 0.9])
    // loses precision snapping to the nearest one — icon-offset corrects that gap (see
    // anchorToMaplibreOffset's comment for the maths). Registered via registerSymbolIconOffset
    // rather than written onto the feature.
    const offset = anchorToMaplibreOffset(rawAnchor, getSymbolViewBox(properties, symbolDef))
    registerSymbolIconOffset(map, symbolImageId, offset)

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
      properties: {
        ...properties,
        symbolImageId,
        symbolIconAnchor: anchor,
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
