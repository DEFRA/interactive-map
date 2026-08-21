import { getFeatureLayerIds } from './featureLayerGroup.js'

// A stable, empty, never-rendered layer purely as a moveLayer() reference point — every draw
// feature layer chains downward from this, so we never depend on mapbox-gl-draw's own layer
// ids (or any other plugin's) as an anchor. Shares the draw- prefix so isDrawOwnedLayerId below
// (and MaplibreDrawAdapter's styledata re-assertion) recognise it as part of the same group.
const ANCHOR_ID = 'draw-anchor'

const isDrawOwnedLayerId = (id) => id.startsWith('draw-')

const ensureAnchorLayer = (map) => {
  if (map.getLayer(ANCHOR_ID)) {
    return
  }
  if (!map.getSource(ANCHOR_ID)) {
    map.addSource(ANCHOR_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }
  map.addLayer({ id: ANCHOR_ID, type: 'symbol', source: ANCHOR_ID, layout: { visibility: 'none' } })
}

// Full, deterministic pass over order (back-to-front), never a per-feature incremental move —
// this is what guarantees a feature's own layer pair can never end up separated by another
// feature's layer landing between them. Walks top to bottom, chaining every feature's own
// layer(s) directly off a running cursor that starts at the anchor. moveLayer is a cheap,
// idempotent position update, so doing this in full on every create/move is the safe default,
// not a performance tradeoff. geometryTypeForId supplies each feature's geometry type, since
// this module owns no feature data of its own.
const applyLayerOrder = (map, order, geometryTypeForId) => {
  ensureAnchorLayer(map)
  let cursor = ANCHOR_ID
  for (let i = order.length - 1; i >= 0; i--) {
    const featureId = order[i]
    const layerIds = getFeatureLayerIds(featureId, geometryTypeForId(featureId))
    layerIds.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.moveLayer(layerId, cursor)
        cursor = layerId
      }
    })
  }
}

export {
  ANCHOR_ID,
  isDrawOwnedLayerId,
  ensureAnchorLayer,
  applyLayerOrder
}
