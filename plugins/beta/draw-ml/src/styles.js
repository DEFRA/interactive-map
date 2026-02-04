// styles.js
import { DEFAULTS } from './defaults.js'

const getColorScheme = (mapStyle) => mapStyle.mapColorScheme ?? 'light'

const getUserProp = (mapStyle, prop) => [
  'coalesce',
  ['get', `user_${prop}${mapStyle.id.charAt(0).toUpperCase() + mapStyle.id.slice(1)}`],
  ['get', `user_${prop}`],
  DEFAULTS[prop]
]

// Inactive lines and fills
const fillInactive = (mapStyle) => ({
  id: 'fill-inactive',
  type: 'fill',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
  paint: { 'fill-color': getUserProp(mapStyle, 'fill') }
})

const strokeInactive = (mapStyle) => ({
  id: 'stroke-inactive',
  type: 'line',
  filter: ['all', ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']], ['==', 'active', 'false'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: {
    'line-color': getUserProp(mapStyle, 'stroke'),
    'line-width': getUserProp(mapStyle, 'strokeWidth')
  }
})

// Active lines and fills
const fillActive = (foregroundColor) => ({
  id: 'fill-active',
  type: 'fill',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
  paint: { 'fill-color': foregroundColor, 'fill-opacity': 0.1 }
})

const strokeActive = (foregroundColor) => ({
  id: 'stroke-active',
  type: 'line',
  filter: ['all', ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']], ['==', 'active', 'true'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': foregroundColor, 'line-width': 2, 'line-opacity': 1 }
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
const drawPreviewLine = (foregroundColor) => ({
  id: 'stroke-preview-line',
  type: 'line',
  filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true'], ['!has', 'user_splitter']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': foregroundColor, 'line-width': 2, 'line-dasharray': [0.2, 2], 'line-opacity': 1 }
})

// Vertex layers
const vertex = (foregroundColor) => ({
  id: 'vertex',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
  paint: { 'circle-radius': 6, 'circle-color': foregroundColor }
})

const vertexHalo = (backgroundColor, haloColor) => ({
  id: 'vertex-halo',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 8, 'circle-stroke-width': 3, 'circle-color': backgroundColor, 'circle-stroke-color': haloColor }
})

const vertexActive = (foregroundColor) => ({
  id: 'vertex-active',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 6, 'circle-color': foregroundColor }
})

// Midpoints
const midpoint = (foregroundColor) => ({
  id: 'midpoint',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
  paint: { 'circle-radius': 4, 'circle-color': foregroundColor }
})

const midpointHalo = (backgroundColor, haloColor) => ({
  id: 'midpoint-halo',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 6, 'circle-stroke-width': 3, 'circle-color': backgroundColor, 'circle-stroke-color': haloColor }
})

const midpointActive = (foregroundColor) => ({
  id: 'midpoint-active',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 4, 'circle-color': foregroundColor }
})

const circle = (foregroundColor) => ({
  id: 'circle',
  type: 'line',
  filter: ['==', 'id', 'circle'],
  paint: { 'line-color': foregroundColor, 'line-width': 2, 'line-opacity': 0.8 }
})

const touchVertexIndicator = () => ({
  id: 'touch-vertex-indicator',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'touch-vertex-indicator']],
  paint: { 'circle-radius': 30, 'circle-color': '#3bb2d0', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.9 }
})

const createDrawStyles = (mapStyle) => {
  const foregroundColor = DEFAULTS.editColorsForeground[getColorScheme(mapStyle)]
  const backgroundColor = DEFAULTS.editColorsBackground[getColorScheme(mapStyle)]
  const haloColor = DEFAULTS.editColorsHalo[getColorScheme(mapStyle)]
  const splitInvalidColor = DEFAULTS.splitInvalidColors[getColorScheme(mapStyle)]
  const splitValidColor = DEFAULTS.splitValidColors[getColorScheme(mapStyle)]

  return [
    fillInactive(mapStyle),
    fillActive(foregroundColor),
    strokeActive(foregroundColor),
    strokeInactive(mapStyle),
    drawInvalidSplitter(splitInvalidColor),
    drawValidSplitter(splitValidColor),
    drawPreviewLine(foregroundColor),
    midpoint(foregroundColor),
    midpointHalo(backgroundColor, haloColor),
    midpointActive(foregroundColor),
    vertex(foregroundColor),
    vertexHalo(backgroundColor, haloColor),
    vertexActive(foregroundColor),
    circle(foregroundColor),
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
