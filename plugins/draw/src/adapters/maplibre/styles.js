// styles.js
import { SIZES } from './defaults.js'
import { resolveColors } from '../../utils/resolveColors.js'

// `defaultValue` is the already-resolved fallback (colors[defaultsKey] — the
// plugin-config override if one was set, else the built-in default), not the
// raw COLORS constant, so a shapeStroke/shapeFill override applies to every
// feature that doesn't set its own stroke/fill property.
const getUserProp = (mapStyle, prop, defaultValue) => [
  'coalesce',
  ['get', `user_${prop}${mapStyle.id.charAt(0).toUpperCase() + mapStyle.id.slice(1)}`],
  ['get', `user_${prop}`],
  defaultValue
]

// Inactive lines and fills
const fillInactive = (mapStyle, colors) => ({
  id: 'fill-inactive',
  type: 'fill',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
  paint: { 'fill-color': getUserProp(mapStyle, 'fill', colors.shapeFill) }
})

const strokeInactive = (mapStyle, colors) => ({
  id: 'stroke-inactive',
  type: 'line',
  filter: ['all', ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']], ['==', 'active', 'false'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': getUserProp(mapStyle, 'stroke', colors.shapeStroke),
    'line-width': colors.strokeWidth
  }
})

// Active lines and fills (sketch during drawing)
const fillActive = (editFillColor) => ({
  id: 'fill-active',
  type: 'fill',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
  paint: { 'fill-color': editFillColor }
})

const strokeActive = (editStrokeColor) => ({
  id: 'stroke-active',
  type: 'line',
  filter: ['all', ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']], ['==', 'active', 'true'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': editStrokeColor, 'line-width': 2, 'line-opacity': 1 }
})

// Dashed stroke shown in place of stroke-active while the shape is invalid. Same
// filter as stroke-active; the adapter's setInvalid() toggles the two layers'
// visibility (line-dasharray can't be data-driven per feature in MapLibre).
const strokeActiveInvalid = (invalidStrokeColor) => ({
  id: 'stroke-active-invalid',
  type: 'line',
  filter: ['all', ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']], ['==', 'active', 'true'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
  paint: {
    'line-color': invalidStrokeColor,
    'line-width': 2,
    'line-dasharray': [0.2, 2], // NOSONAR
    'line-opacity': 1
  }
})

// Splitter line
const drawInvalidSplitter = (splitInvalidColor) => ({
  id: 'stroke-invalid-splitter',
  type: 'line',
  filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true'], ['==', 'user_splitter', 'invalid']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': splitInvalidColor,
    'line-width': 2,
    'line-dasharray': [0.2, 2], // NOSONAR
    'line-opacity': 1
  }
})

const drawValidSplitter = (splitValidColor) => ({
  id: 'stroke-valid-splitter',
  type: 'line',
  filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true'], ['==', 'user_splitter', 'valid']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': splitValidColor,
    'line-width': 2,
    'line-opacity': 1
  }
})

// Dashed preview line
const drawPreviewLine = (editStrokeColor) => ({
  id: 'stroke-preview-line',
  type: 'line',
  filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': editStrokeColor, 'line-width': 2, 'line-dasharray': [0.2, 2], 'line-opacity': 1 } // NOSONAR
})

// Vertex layers ('draw-vertex' = display-only markers on placed vertices while drawing)
const vertex = (editVertexColor, vertexRadius) => ({
  id: 'vertex',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['in', 'meta', 'vertex', 'draw-vertex']],
  paint: { 'circle-radius': vertexRadius, 'circle-color': editVertexColor }
})

const vertexHalo = (editHaloColor, editActiveColor, vertexHaloRadius) => ({
  id: 'vertex-halo',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
  paint: { 'circle-radius': vertexHaloRadius, 'circle-stroke-width': 3, 'circle-color': editHaloColor, 'circle-stroke-color': editActiveColor }
})

const vertexActive = (editVertexColor, vertexRadius) => ({
  id: 'vertex-active',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
  paint: { 'circle-radius': vertexRadius, 'circle-color': editVertexColor }
})

// Midpoints
const midpoint = (editMidpointColor, midpointRadius) => ({
  id: 'midpoint',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
  paint: { 'circle-radius': midpointRadius, 'circle-color': editMidpointColor }
})

const midpointHalo = (editHaloColor, editActiveColor, midpointHaloRadius) => ({
  id: 'midpoint-halo',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint'], ['==', 'active', 'true']],
  paint: { 'circle-radius': midpointHaloRadius, 'circle-stroke-width': 3, 'circle-color': editHaloColor, 'circle-stroke-color': editActiveColor }
})

const midpointActive = (editMidpointColor, midpointRadius) => ({
  id: 'midpoint-active',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint'], ['==', 'active', 'true']],
  paint: { 'circle-radius': midpointRadius, 'circle-color': editMidpointColor }
})

const circle = (editStrokeColor) => ({
  id: 'circle',
  type: 'line',
  filter: ['==', 'id', 'circle'],
  paint: { 'line-color': editStrokeColor, 'line-width': 2, 'line-opacity': 0.8 }
})

// A committed point feature, rendered as its resolved symbol-config icon rather than a
// paint colour — icon-image/icon-anchor/icon-offset are data-driven per feature
// (pointSymbolImages.js resolves and writes user_symbolImageId/user_symbolIconAnchor/
// user_symbolIconOffset onto each point feature as its symbol config changes), so no
// colour/size params are needed here at all; the image itself carries the styling.
// icon-offset compensates for icon-anchor's 9-position precision limit — see
// anchorToMaplibreOffset's own comment (providers/maplibre/src/utils/symbolImages.js).
// Every mapbox-gl-draw feature carries a `meta` property, not just the internal
// vertex/midpoint/touch-indicator handles — an ordinary committed feature gets
// `meta: 'feature'` (Feature.prototype.internal() in the library itself), so this matches
// that value directly rather than excluding features that merely have some `meta`.
// Included via createDrawStyles() (not a manual map.addLayer() call) so MapboxDraw's own
// style-injection duplicates it across both the cold and hot sources, same as every other
// draw layer.
const pointSymbol = () => ({
  id: 'point-symbol',
  type: 'symbol',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
  layout: {
    'icon-image': ['get', 'user_symbolImageId'],
    'icon-anchor': ['get', 'user_symbolIconAnchor'],
    'icon-offset': ['get', 'user_symbolIconOffset'],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true
  },
  // No paint properties of its own (styling comes entirely from the resolved icon image),
  // but updateDrawStyles() below iterates every layer's paint object unconditionally, so
  // this still needs to exist, even empty.
  paint: {}
})

const touchVertexIndicator = () => ({
  id: 'touch-vertex-indicator',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'touch-vertex-indicator']],
  paint: { 'circle-radius': 30, 'circle-color': '#3bb2d0', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.9 }
})

// `pluginConfig` lets callers override any of these colours/strokeWidth — see
// resolveColors() and the draw plugin's own options docs. Unaffected keys
// still resolve to the built-in COLORS/SIZES defaults.
const createDrawStyles = (mapStyle, pluginConfig = {}) => {
  const colors = resolveColors(mapStyle, pluginConfig)
  const { vertexRadius, midpointRadius, vertexHaloRadius, midpointHaloRadius } = SIZES

  return [
    fillInactive(mapStyle, colors),
    fillActive(colors.editFill),
    strokeActive(colors.editStroke),
    strokeActiveInvalid(colors.invalidStroke),
    strokeInactive(mapStyle, colors),
    pointSymbol(),
    drawInvalidSplitter(colors.splitInvalid),
    drawValidSplitter(colors.splitValid),
    drawPreviewLine(colors.editStroke),
    midpoint(colors.editMidpoint, midpointRadius),
    midpointHalo(colors.editHalo, colors.editActive, midpointHaloRadius),
    midpointActive(colors.editMidpoint, midpointRadius),
    vertex(colors.editVertex, vertexRadius),
    vertexHalo(colors.editHalo, colors.editActive, vertexHaloRadius),
    vertexActive(colors.editVertex, vertexRadius),
    circle(colors.editStroke),
    touchVertexIndicator()
  ]
}

/**
 * Helper to iterate over a MapLibre map and apply new paint properties
 */
const updateDrawStyles = (map, mapStyle, pluginConfig = {}) => {
  const layers = createDrawStyles(mapStyle, pluginConfig)
  layers.forEach(layer => {
    Object.entries(layer.paint).forEach(([prop, value]) => {
      if (map.getLayer(`${layer.id}.cold`)) {
        map.setPaintProperty(`${layer.id}.cold`, prop, value)
      }
      if (map.getLayer(`${layer.id}.hot`)) {
        map.setPaintProperty(`${layer.id}.hot`, prop, value)
      }
    })
  })
}

export {
  createDrawStyles,
  updateDrawStyles
}
