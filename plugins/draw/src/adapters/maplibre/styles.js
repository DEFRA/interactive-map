// styles.js
import { COLORS, SIZES } from './defaults.js'
import { getValueForStyle } from '../../utils/getValueForStyle.js'

const getColorScheme = (mapStyle) => mapStyle.mapColorScheme ?? 'light'

const getUserProp = (mapStyle, prop, defaultsKey) => [
  'coalesce',
  ['get', `user_${prop}${mapStyle.id.charAt(0).toUpperCase() + mapStyle.id.slice(1)}`],
  ['get', `user_${prop}`],
  COLORS[defaultsKey]
]

// Inactive lines and fills
const fillInactive = (mapStyle) => ({
  id: 'fill-inactive',
  type: 'fill',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
  paint: { 'fill-color': getUserProp(mapStyle, 'fill', 'shapeFill') }
})

const strokeInactive = (mapStyle) => ({
  id: 'stroke-inactive',
  type: 'line',
  filter: ['all', ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']], ['==', 'active', 'false'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': getUserProp(mapStyle, 'stroke', 'shapeStroke'),
    'line-width': SIZES.strokeWidth
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

const touchVertexIndicator = () => ({
  id: 'touch-vertex-indicator',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'touch-vertex-indicator']],
  paint: { 'circle-radius': 30, 'circle-color': '#3bb2d0', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.9 }
})

const createDrawStyles = (mapStyle) => {
  const scheme = getColorScheme(mapStyle)
  const editStrokeColor = getValueForStyle(COLORS.editStroke, scheme)
  const editFillColor = getValueForStyle(COLORS.editFill, scheme)
  const editVertexColor = getValueForStyle(COLORS.editVertex, scheme)
  const editMidpointColor = getValueForStyle(COLORS.editMidpoint, scheme)
  const editHaloColor = getValueForStyle(COLORS.editHalo, scheme)
  const editActiveColor = getValueForStyle(COLORS.editActive, scheme)
  const splitInvalidColor = getValueForStyle(COLORS.splitInvalid, scheme)
  const splitValidColor = getValueForStyle(COLORS.splitValid, scheme)
  const invalidStrokeColor = getValueForStyle(COLORS.invalidStroke, scheme)
  const { vertexRadius, midpointRadius, vertexHaloRadius, midpointHaloRadius } = SIZES

  return [
    fillInactive(mapStyle),
    fillActive(editFillColor),
    strokeActive(editStrokeColor),
    strokeActiveInvalid(invalidStrokeColor),
    strokeInactive(mapStyle),
    drawInvalidSplitter(splitInvalidColor),
    drawValidSplitter(splitValidColor),
    drawPreviewLine(editStrokeColor),
    midpoint(editMidpointColor, midpointRadius),
    midpointHalo(editHaloColor, editActiveColor, midpointHaloRadius),
    midpointActive(editMidpointColor, midpointRadius),
    vertex(editVertexColor, vertexRadius),
    vertexHalo(editHaloColor, editActiveColor, vertexHaloRadius),
    vertexActive(editVertexColor, vertexRadius),
    circle(editStrokeColor),
    touchVertexIndicator()
  ]
}

/**
 * Helper to iterate over a MapLibre map and apply new paint properties
 */
const updateDrawStyles = (map, mapStyle) => {
  const layers = createDrawStyles(mapStyle)
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
