// styles.js
import { SIZES } from './defaults.js'
import { resolveColors } from '../../utils/resolveColors.js'

// `defaultValue` is the already-resolved fallback (plugin-config override or built-in default), so a shapeStroke/shapeFill override applies to every feature without its own.
const getUserProp = (mapStyle, prop, defaultValue) => [
  'coalesce',
  ['get', `user_${prop}${mapStyle.id.charAt(0).toUpperCase() + mapStyle.id.slice(1)}`],
  ['get', `user_${prop}`],
  defaultValue
]

// Every feature gets an incrementing user_sortKey property when it's created (see
// MaplibreDrawAdapter.js's _nextSortKey) — later-drawn features paint on top of earlier ones
// within the same shared layer, instead of the order being incidental to which of mapbox-gl-
// draw's cold/hot buckets a feature happens to be in.
const SORT_KEY_PROP = ['get', 'user_sortKey']

// Inactive lines and fills
const fillInactive = (mapStyle, colors) => ({
  id: 'fill-inactive',
  type: 'fill',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
  layout: { 'fill-sort-key': SORT_KEY_PROP },
  paint: { 'fill-color': getUserProp(mapStyle, 'fill', colors.shapeFill) }
})

const strokeInactive = (mapStyle, colors) => ({
  id: 'stroke-inactive',
  type: 'line',
  filter: ['all', ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']], ['==', 'active', 'false'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': SORT_KEY_PROP },
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

// Dashed stroke shown in place of stroke-active while invalid — the adapter's setInvalid() toggles the two layers' visibility (line-dasharray can't be data-driven per feature).
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

// A committed point renders its resolved symbol-config icon (pointSymbolImages.js writes user_symbolImageId/user_symbolIconAnchor onto each feature). While a point is being edited (active:'true'), icon-image swaps to its precomputed "selected" variant — the same one the interact plugin's own highlight uses — so the look persists for the whole edit session instead of disappearing when that highlight is cleared on entering edit mode.
// icon-offset is deliberately NOT a per-feature `get` here — MapLibre's GeoJSON sources
// silently JSON.stringify array properties, so it would read back a string, not an array.
// pointSymbolImages.js's registerSymbolIconOffset overwrites this default via
// setLayoutProperty with a `match` expression once a point needs a non-zero offset.
const pointSymbol = () => ({
  id: 'point-symbol',
  type: 'symbol',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
  layout: {
    'icon-image': [
      'case',
      ['==', ['get', 'active'], 'true'],
      ['coalesce', ['get', 'user_symbolSelectedImageId'], ['get', 'user_symbolImageId']],
      ['get', 'user_symbolImageId']
    ],
    'icon-anchor': ['get', 'user_symbolIconAnchor'],
    'icon-offset': ['literal', [0, 0]],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'symbol-sort-key': SORT_KEY_PROP
  },
  // Empty but required — updateDrawStyles() below iterates every layer's paint object unconditionally.
  paint: {}
})

const touchVertexIndicator = () => ({
  id: 'touch-vertex-indicator',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'touch-vertex-indicator']],
  paint: { 'circle-radius': 30, 'circle-color': '#3bb2d0', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.9 }
})

// `pluginConfig` lets callers override any of these colours/strokeWidth (see resolveColors()); unaffected keys fall back to the built-in defaults.
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
