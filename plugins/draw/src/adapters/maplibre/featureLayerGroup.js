// Creates/removes the single source + layer(s) belonging to one committed feature — one feature
// per source, mirroring datasets.addDataset but scoped to a single feature. Lives entirely
// outside mapbox-gl-draw's own hot/cold sources, which is what gives full stacking control
// (see layerOrder.js) and stops a colour change or an async icon resolve from silently
// reordering a feature the way mapbox-gl-draw's own store does.
//
// Paint reads properties unprefixed (fill/fillOutdoor/stroke/symbolImageId/...) — unlike
// mapbox-gl-draw's own style layers, these sources hold plain GeoJSON, never user_-prefixed.

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Unprefixed equivalent of styles.js's getUserProp, for the same reason.
const getFeatureProp = (mapStyle, prop, defaultValue) => [
  'coalesce',
  ['get', `${prop}${capitalize(mapStyle.id)}`],
  ['get', prop],
  defaultValue
]

const getSourceId = (featureId) => `draw-${featureId}`
const getLayerId = (featureId, suffix) => `draw-${featureId}-${suffix}`

const buildFillLayer = (featureId, source, mapStyle, colors) => ({
  id: getLayerId(featureId, 'fill'),
  type: 'fill',
  source,
  paint: { 'fill-color': getFeatureProp(mapStyle, 'fill', colors.shapeFill) }
})

const buildLineLayer = (featureId, source, mapStyle, colors) => ({
  id: getLayerId(featureId, 'line'),
  type: 'line',
  source,
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': getFeatureProp(mapStyle, 'stroke', colors.shapeStroke),
    'line-width': colors.strokeWidth
  }
})

const buildSymbolLayer = (featureId, source) => ({
  id: getLayerId(featureId, 'symbol'),
  type: 'symbol',
  source,
  layout: {
    // symbolSelectedImageId is a precomputed variant, not a live flag — resolvePointSymbol
    // writes it onto every point regardless of selection state, so it must never be coalesced
    // to unconditionally (that showed every point permanently "selected"). Unlike mapbox-gl-
    // draw's own point-symbol layer, which swaps to it only while active === 'true' (its own
    // mid-edit flag), our own layer is never used for an actively-edited feature at all — a
    // committed feature's selected look is the separate highlight overlay's job entirely
    // (highlightFeatures.js), not this layer's.
    'icon-image': ['get', 'symbolImageId'],
    'icon-anchor': ['get', 'symbolIconAnchor'],
    'icon-offset': ['get', 'symbolIconOffset'],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true
  },
  paint: {}
})

// The layer(s) a feature's geometry type needs — a Polygon gets fill+line, a LineString just
// line, a Point just symbol. Order here is the fixed internal sub-order layerOrder.js chains
// together (stroke/line above its own fill), never varies with the feature's own paint order.
const buildLayers = (feature, mapStyle, colors) => {
  const source = getSourceId(feature.id)
  const type = feature.geometry?.type
  if (type === 'Polygon') {
    return [buildLineLayer(feature.id, source, mapStyle, colors), buildFillLayer(feature.id, source, mapStyle, colors)]
  }
  if (type === 'LineString') {
    return [buildLineLayer(feature.id, source, mapStyle, colors)]
  }
  return [buildSymbolLayer(feature.id, source)]
}

// Layer ids for a feature, without building anything — for callers (delete, reorder) that
// only need to know what exists, given the geometry type they already have on hand.
const getFeatureLayerIds = (featureId, geometryType) => {
  if (geometryType === 'Polygon') {
    return [getLayerId(featureId, 'line'), getLayerId(featureId, 'fill')]
  }
  if (geometryType === 'LineString') {
    return [getLayerId(featureId, 'line')]
  }
  return [getLayerId(featureId, 'symbol')]
}

// Adds the feature's own source + layer(s), chained downward from beforeId — buildLayers
// already returns them topmost-first (line above its own fill), so each one is inserted
// directly below the last, never both at the same beforeId (which would invert the pair).
// The caller (layerOrder.js) is responsible for what the initial beforeId actually is.
const createFeatureLayerGroup = ({ map, feature, mapStyle, colors, beforeId }) => {
  const source = getSourceId(feature.id)
  map.addSource(source, { type: 'geojson', data: { type: 'FeatureCollection', features: [feature] } })
  const layers = buildLayers(feature, mapStyle, colors)
  let cursor = beforeId
  layers.forEach((layer) => {
    map.addLayer(layer, cursor)
    cursor = layer.id
  })
  return layers.map((layer) => layer.id)
}

const removeFeatureLayerGroup = ({ map, featureId, geometryType }) => {
  getFeatureLayerIds(featureId, geometryType).forEach((id) => {
    if (map.getLayer(id)) { map.removeLayer(id) }
  })
  const source = getSourceId(featureId)
  if (map.getSource(source)) { map.removeSource(source) }
}

// Refreshes a feature's own source data in place — used for setStyle, and for Done/Cancel
// putting the edited or original feature back after an edit session. Cheap: no layer churn.
const setFeatureLayerGroupData = ({ map, featureId, feature }) => {
  map.getSource(getSourceId(featureId))?.setData({ type: 'FeatureCollection', features: feature ? [feature] : [] })
}

export {
  getSourceId,
  getFeatureLayerIds,
  createFeatureLayerGroup,
  removeFeatureLayerGroup,
  setFeatureLayerGroupData
}
