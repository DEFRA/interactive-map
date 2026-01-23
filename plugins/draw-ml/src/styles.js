// styles.js
const BLACK = '#0b0c0c'
const WHITE = '#ffffff'

const fillActive = (fgColor) => ({
  id: 'fill-active',
  type: 'fill',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
  paint: { 'fill-color': fgColor, 'fill-opacity': 0.1 }
})

const strokeActive = (fgColor) => ({
  id: 'stroke-active',
  type: 'line',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': fgColor, 'line-width': 2, 'line-opacity': 1 }
})

const strokeInactive = (fgColor) => ({
  id: 'stroke-inactive',
  type: 'line',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': fgColor, 'line-width': 2, 'line-opacity': 0.8 }
})

const drawPreviewLine = (fgColor) => ({
  id: 'stroke-preview-line',
  type: 'line',
  filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': fgColor, 'line-width': 2, 'line-dasharray': [0.2, 2], 'line-opacity': 1 }
})

// Vertex layers
const vertex = (fgColor) => ({
  id: 'vertex',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
  paint: { 'circle-radius': 6, 'circle-color': fgColor }
})

const vertexHalo = (bgColor, hColor) => ({
  id: 'vertex-halo',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 8, 'circle-stroke-width': 3, 'circle-color': bgColor, 'circle-stroke-color': hColor }
})

const vertexActive = (fgColor) => ({
  id: 'vertex-active',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 6, 'circle-color': fgColor }
})

// Midpoints
const midpoint = (fgColor) => ({
  id: 'midpoint',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
  paint: { 'circle-radius': 4, 'circle-color': fgColor }
})

const midpointHalo = (bgColor, hColor) => ({
  id: 'midpoint-halo',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 6, 'circle-stroke-width': 3, 'circle-color': bgColor, 'circle-stroke-color': hColor }
})

const midpointActive = (fgColor) => ({
  id: 'midpoint-active',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint'], ['==', 'active', 'true']],
  paint: { 'circle-radius': 4, 'circle-color': fgColor }
})

const circle = (fgColor) => ({
  id: 'circle',
  type: 'line',
  filter: ['==', 'id', 'circle'],
  paint: { 'line-color': fgColor, 'line-width': 2, 'line-opacity': 0.8 }
})

const touchVertexIndicator = () => ({
  id: 'touch-vertex-indicator',
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'touch-vertex-indicator']],
  paint: { 'circle-radius': 30, 'circle-color': '#3bb2d0', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.9 }
})

const createDrawStyles = (colorScheme) => {
  const fgColor = colorScheme === 'dark' ? WHITE : BLACK
  const bgColor = colorScheme === 'dark' ? BLACK : WHITE
  const hColor = colorScheme === 'dark' ? WHITE : BLACK

  return [
    fillActive(fgColor),
    strokeActive(fgColor),
    strokeInactive(fgColor),
    drawPreviewLine(fgColor),
    midpoint(fgColor),
    midpointHalo(bgColor, hColor),
    midpointActive(fgColor),
    vertex(fgColor),
    vertexHalo(bgColor, hColor),
    vertexActive(fgColor),
    circle(fgColor),
    touchVertexIndicator()
  ]
}

/**
 * Helper to iterate over a MapLibre map and apply new paint properties
 */
const updateDrawStyles = (map, colorScheme) => {
  const layers = createDrawStyles(colorScheme)
  layers.forEach((layer) => {
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
