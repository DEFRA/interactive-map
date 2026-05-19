// styles.js
import { DEFAULTS } from './defaults.js'

const getColorScheme = (mapStyle) => mapStyle.mapColorScheme ?? 'light'

const getUserProp = (mapStyle, prop, defaultsKey = prop) => [
  'coalesce',
  ['get', `user_${prop}${mapStyle.id.charAt(0).toUpperCase() + mapStyle.id.slice(1)}`],
  ['get', `user_${prop}`],
  DEFAULTS[defaultsKey]
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
    'line-width': getUserProp(mapStyle, 'strokeWidth')
  }
})

// Active lines and fills
const fillActive = (editStrokeColor) => ({
  id: 'fill-active',
  type: 'fill',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
  paint: { 'fill-color': editStrokeColor, 'fill-opacity': 0.1 }
})

const strokeActive = (editStrokeColor) => ({
  id: 'stroke-active',
  type: 'line',
  filter: ['all', ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']], ['==', 'active', 'true'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': editStrokeColor, 'line-width': 2, 'line-opacity': 1 }
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
    'line-dasharray': [0.2, 2],
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
  paint: { 'line-color': editStrokeColor, 'line-width': 2, 'line-dasharray': [0.2, 2], 'line-opacity': 1 }
})

// Vertex layers
const vertex = (editVertexColor) => ({
  id: 'vertex',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
  paint: { 'circle-radius': 6, 'circle-color': editVertexColor }
})

const vertexHalo = (editHaloColor, editActiveColor) => ({
  id: 'vertex-halo',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 8, 'circle-stroke-width': 3, 'circle-color': editHaloColor, 'circle-stroke-color': editActiveColor }
})

const vertexActive = (editVertexColor) => ({
  id: 'vertex-active',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 6, 'circle-color': editVertexColor }
})

// Midpoints
const midpoint = (editMidpointColor) => ({
  id: 'midpoint',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
  paint: { 'circle-radius': 4, 'circle-color': editMidpointColor }
})

const midpointHalo = (editHaloColor, editActiveColor) => ({
  id: 'midpoint-halo',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 6, 'circle-stroke-width': 3, 'circle-color': editHaloColor, 'circle-stroke-color': editActiveColor }
})

const midpointActive = (editMidpointColor) => ({
  id: 'midpoint-active',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 4, 'circle-color': editMidpointColor }
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
  const editStrokeColor = DEFAULTS.editStroke[scheme]
  const editVertexColor = DEFAULTS.editVertex[scheme]
  const editMidpointColor = DEFAULTS.editMidpoint[scheme]
  const editHaloColor = DEFAULTS.editHalo[scheme]
  const editActiveColor = DEFAULTS.editActive[scheme]
  const splitInvalidColor = DEFAULTS.splitInvalid[scheme]
  const splitValidColor = DEFAULTS.splitValid[scheme]

  return [
    fillInactive(mapStyle),
    fillActive(editStrokeColor),
    strokeActive(editStrokeColor),
    strokeInactive(mapStyle),
    drawInvalidSplitter(splitInvalidColor),
    drawValidSplitter(splitValidColor),
    drawPreviewLine(editStrokeColor),
    midpoint(editMidpointColor),
    midpointHalo(editHaloColor, editActiveColor),
    midpointActive(editMidpointColor),
    vertex(editVertexColor),
    vertexHalo(editHaloColor, editActiveColor),
    vertexActive(editVertexColor),
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
