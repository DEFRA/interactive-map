import { symbolRegistry } from '../../../../../src/services/symbolRegistry.js'
import { getSymbolAnchor, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { anchorToMaplibre, anchorToMaplibreOffset } from '../../../../../providers/maplibre/src/utils/symbolImages.js'

/**
 * Resolves and registers a drawn point's symbol-config icon (same schema as addMarker/dataset
 * points — see src/config/symbolConfig.js), writing the resolved image id/anchor back onto
 * the feature so styles.js's pointSymbol() layer can render it. icon-offset is handled
 * separately below since it can't safely be a per-feature property.
 */

export const hasSymbolStyle = (properties) => !!(properties?.symbol || properties?.symbolSvgContent)

const POINT_SYMBOL_LAYER_ID = 'point-symbol'

// icon-offset can't be a raw per-feature `get` on an array property — MapLibre's GeoJSON
// sources silently JSON.stringify arrays, so it reads back a string at render time. Instead
// each symbolImageId's offset is folded into a `match` expression keyed on that (safe, string) property.
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

// map.getPixelRatio() is only set once at map construction, so it won't reflect a later
// map-size change on its own. Callers reacting to MAP_SET_PIXEL_RATIO should pass the fresh
// value through as pixelRatioOverride instead.
export const getPixelRatio = (map) => map.getPixelRatio?.() || 1

// Does the async work for one point without touching the store — draw.add() is left to the
// caller so refreshAllPointSymbols can batch every point into one call (see its comment why).
// Returns null if there's nothing to write back (no symbol config, feature gone, or unresolvable id).
const resolvePointSymbolFeature = async ({ draw, mapProvider, map, featureId, properties, pixelRatioOverride }) => {
  if (!hasSymbolStyle(properties)) {
    return null
  }

  const mapStyle = map._drawCurrentMapStyle
  const pixelRatio = pixelRatioOverride ?? getPixelRatio(map)

  await mapProvider.addSymbolsToMap([properties], mapStyle, symbolRegistry)

  const feature = draw.get(featureId)
  if (!feature) {
    return null
  }

  const symbolImageId = symbolRegistry.getSymbolImageId(properties, mapStyle, false, pixelRatio)
  if (!symbolImageId) {
    return null
  }
  // addSymbolsToMap() (just awaited above) already mapped this id's active/selected variants
  // into map._activeSymbolImageMap/_selectedSymbolImageMap — read them back so the highlight
  // ring (highlightFeatures.js) can reference each point's own precomputed variant directly.
  const symbolActiveImageId = map._activeSymbolImageMap?.[symbolImageId] ?? null
  const symbolSelectedImageId = map._selectedSymbolImageMap?.[symbolImageId] ?? null
  const symbolDef = symbolRegistry.getSymbolDef(properties)
  const rawAnchor = getSymbolAnchor(properties, symbolDef)
  const anchor = anchorToMaplibre(rawAnchor)
  // icon-anchor only has 9 discrete positions, so an off-grid anchor (e.g. pin's [0.5, 0.9])
  // loses precision snapping to the nearest one — icon-offset corrects that gap.
  const offset = anchorToMaplibreOffset(rawAnchor, getSymbolViewBox(properties, symbolDef))
  registerSymbolIconOffset(map, symbolImageId, offset)

  return {
    ...feature,
    properties: {
      ...properties,
      symbolImageId,
      symbolIconAnchor: anchor,
      symbolActiveImageId,
      symbolSelectedImageId
    }
  }
}

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
export const resolvePointSymbol = async (params) => {
  try {
    const feature = await resolvePointSymbolFeature(params)
    if (!feature) {
      return
    }
    // draw.setFeatureProperty() only marks the feature dirty for mapbox-gl-draw's own mode-
    // dispatch loop, which won't run again until the next interaction. draw.add() on an
    // existing id updates its properties and renders unconditionally, so it's used instead.
    params.draw.add(feature)
  } catch (err) {
    // A silent failure here means a point simply never gets/keeps an icon, with nothing in
    // the UI to explain why — surface it instead of letting the rejection vanish.
    console.error('[draw] failed to resolve point symbol', params.featureId, err) // NOSONAR
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
export const refreshAllPointSymbols = async ({ draw, mapProvider, map, pixelRatioOverride }) => {
  const points = draw.getAll().features.filter(
    (f) => f.geometry.type === 'Point' && hasSymbolStyle(f.properties)
  )
  const results = await Promise.allSettled(points.map((f) =>
    resolvePointSymbolFeature({ draw, mapProvider, map, featureId: f.id, properties: f.properties, pixelRatioOverride })
  ))

  results.filter((r) => r.status === 'rejected').forEach((r) => {
    console.error('[draw] failed to resolve point symbol', r.reason) // NOSONAR
  })

  // One combined draw.add() call triggers a single render. Adding one point at a time here
  // would let mapbox-gl-draw's debounced render fire mid-batch, painting a not-yet-resolved
  // point with its stale, now-unregistered image id ("Image X could not be loaded").
  const features = results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value)
  if (features.length) {
    draw.add({ type: 'FeatureCollection', features })
  }
}
