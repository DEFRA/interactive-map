import { logger } from '../../../../../src/services/logger.js'

/**
 * Resolves and registers a drawn point's symbol-config icon (same schema as addMarker/dataset
 * points — see src/config/symbolConfig.js), writing the resolved image id/anchor back onto
 * the feature so styles.js's pointSymbol() layer can render it. icon-offset is handled
 * separately below since it can't safely be a per-feature property.
 */

export const hasSymbolStyle = (properties) => !!(properties?.symbol || properties?.symbolSvgContent)

const POINT_SYMBOL_LAYER_ID = 'point-symbol'
const POINT_SYMBOL_LAYER_IDS = new Set([`${POINT_SYMBOL_LAYER_ID}.hot`, `${POINT_SYMBOL_LAYER_ID}.cold`])

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

// Written to both the live layers and draw.options.styles — the definitions mapbox-gl-draw
// builds its layers from, and that mapboxDraw.js's ensureDrawSourcesAndLayers re-adds them
// from after a style change. Without the latter, any rebuild (or a point resolved before the
// layers first exist) would leave the layers on pointSymbol()'s [0, 0] default.
const applyIconOffsetExpression = (map, draw) => {
  const expression = buildIconOffsetExpression(map._symbolIconOffsetMap)
  draw.options?.styles?.forEach((style) => {
    if (POINT_SYMBOL_LAYER_IDS.has(style.id)) {
      style.layout = { ...style.layout, 'icon-offset': expression }
    }
  })
  POINT_SYMBOL_LAYER_IDS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'icon-offset', expression)
    }
  })
}

const registerSymbolIconOffset = (map, draw, symbolImageId, offset) => {
  map._symbolIconOffsetMap ??= {}
  if (map._symbolIconOffsetMap[symbolImageId]) {
    return // offset is deterministic per id — already registered, nothing changed
  }
  map._symbolIconOffsetMap[symbolImageId] = offset
  applyIconOffsetExpression(map, draw)
}

// A style or pixel-ratio change gives every point a new image id, so the old ids' offsets are
// dead weight in the match expression — drop any id no drawn point uses any more.
const pruneSymbolIconOffsets = (map, draw) => {
  const offsets = map._symbolIconOffsetMap
  if (!offsets) {
    return
  }
  const inUse = new Set(draw.getAll().features.map((feature) => feature.properties?.symbolImageId))
  const unused = Object.keys(offsets).filter((imageId) => !inUse.has(imageId))
  if (!unused.length) {
    return
  }
  unused.forEach((imageId) => delete offsets[imageId])
  applyIconOffsetExpression(map, draw)
}

// The map's current pixel ratio (device pixel ratio × map-size scale factor). Callers reacting to
// MAP_SET_PIXEL_RATIO pass the event's value through as pixelRatioOverride instead, so they don't
// depend on the provider's listener having applied it to the map first.
export const getPixelRatio = (map) => map.getPixelRatio?.() || 1

// Does the async work for one point without touching the store — draw.add() is left to the
// caller so refreshAllPointSymbols can batch every point into one call (see its comment why).
// Returns null if there's nothing to write back (no symbol config, feature gone, or unresolvable id).
const resolvePointSymbolFeature = async ({ draw, mapProvider, map, symbolRegistry, featureId, properties, pixelRatioOverride }) => {
  if (!hasSymbolStyle(properties)) {
    return null
  }

  const mapStyle = map._drawCurrentMapStyle
  const pixelRatio = pixelRatioOverride ?? getPixelRatio(map)

  await mapProvider.addSymbolsToMap([properties], mapStyle, symbolRegistry, pixelRatio)

  const feature = draw.get(featureId)
  if (!feature) {
    return null
  }

  const symbolImageId = symbolRegistry.getSymbolImageId(properties, mapStyle, 'normal', pixelRatio)
  if (!symbolImageId) {
    return null
  }
  // addSymbolsToMap() (just awaited above) also registered this id's active/selected variants —
  // read them back so the highlight ring (highlightFeatures.js) can reference each point's own
  // precomputed variant directly.
  const symbolActiveImageId = mapProvider.getActiveSymbolImageId(symbolImageId)
  const symbolSelectedImageId = mapProvider.getSelectedSymbolImageId(symbolImageId)
  const iconLayout = mapProvider.getSymbolIconLayout(symbolRegistry.getSymbolDef(properties))
  registerSymbolIconOffset(map, draw, symbolImageId, iconLayout['icon-offset'])

  return {
    ...feature,
    properties: {
      ...properties,
      symbolImageId,
      symbolIconAnchor: iconLayout['icon-anchor'],
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
 * @param {Object} params.mapProvider - MapLibreProvider (needs addSymbolsToMap, getActiveSymbolImageId, getSelectedSymbolImageId, getSymbolIconLayout)
 * @param {Object} params.map - MapLibre map instance (needs _drawCurrentMapStyle, getPixelRatio)
 * @param {Object} params.symbolRegistry - the app's symbol registry (services.symbolRegistry)
 * @param {string} params.featureId
 * @param {Object} params.properties - the point feature's current properties
 * @param {number} [params.pixelRatioOverride] - use this instead of map.getPixelRatio(), for
 *   callers (map-size refresh) that already know the freshly computed value
 * @returns {Promise<void>} rejects if the symbol's images couldn't be registered
 */
export const resolvePointSymbol = async (params) => {
  const feature = await resolvePointSymbolFeature(params)
  if (!feature) {
    return
  }
  // draw.setFeatureProperty() only marks the feature dirty for mapbox-gl-draw's own mode-
  // dispatch loop, which won't run again until the next interaction. draw.add() on an
  // existing id updates its properties and renders unconditionally, so it's used instead.
  params.draw.add(feature)
}

/**
 * Re-resolve every existing drawn point's symbol — called on map style/pixel-ratio change,
 * since the rasterised image (colours, and pixel-ratio-scaled dimensions) depends on both.
 *
 * @param {Object} params
 * @param {Object} params.draw - the raw MapboxDraw instance (needs getAll)
 * @param {Object} params.mapProvider
 * @param {Object} params.map
 * @param {Object} params.symbolRegistry
 * @param {number} [params.pixelRatioOverride] - see resolvePointSymbol
 * @returns {Promise<void>}
 */
export const refreshAllPointSymbols = async ({ draw, mapProvider, map, symbolRegistry, pixelRatioOverride }) => {
  // Refreshes overlap when the map size or style changes again before one finishes; only the
  // latest may write back, so an older one finishing last can't restore its stale image ids
  map._pointSymbolRefreshId = (map._pointSymbolRefreshId ?? 0) + 1
  const refreshId = map._pointSymbolRefreshId
  const points = draw.getAll().features.filter(
    (feature) => feature.geometry.type === 'Point' && hasSymbolStyle(feature.properties)
  )
  const results = await Promise.allSettled(points.map((feature) =>
    resolvePointSymbolFeature({ draw, mapProvider, map, symbolRegistry, featureId: feature.id, properties: feature.properties, pixelRatioOverride })
  ))

  results.filter((result) => result.status === 'rejected').forEach((result) => {
    logger.error('[draw] failed to resolve point symbol', result.reason)
  })
  if (map._pointSymbolRefreshId !== refreshId) {
    return
  }

  // One combined draw.add() call triggers a single render. Adding one point at a time here
  // would let mapbox-gl-draw's debounced render fire mid-batch, painting a not-yet-resolved
  // point with its stale, now-unregistered image id ("Image X could not be loaded").
  const features = results
    .filter((result) => result.status === 'fulfilled' && result.value)
    .map((result) => result.value)
  if (features.length) {
    draw.add({ type: 'FeatureCollection', features })
  }
  pruneSymbolIconOffsets(map, draw)
}
