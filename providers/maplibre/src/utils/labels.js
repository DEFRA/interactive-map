import { spatialNavigate } from './spatial.js'
import { calculateLinearTextSize } from './calculateLinearTextSize.js'

const HIGHLIGHT_SCALE_FACTOR = 1.5
const HIGHLIGHT_LABEL_SOURCE = 'highlighted-label'

export function getGeometryCenter(geometry) {
  const { type, coordinates } = geometry
  if (type === 'Point') {
    return coordinates
  }
  if (type === 'MultiPoint') {
    return coordinates[0]
  }
  if (type.includes('LineString')) {
    const coords = type === 'LineString' ? coordinates : coordinates[0]
    return [(coords[0][0] + coords[coords.length - 1][0]) / 2, (coords[0][1] + coords[coords.length - 1][1]) / 2]
  }
  if (type.includes('Polygon')) {
    const coords = type === 'Polygon' ? coordinates[0] : coordinates[0][0]
    const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0])
    return [sum[0] / coords.length, sum[1] / coords.length]
  }
  return null
}

export function evalInterpolate(expr, zoom) {
  if (typeof expr === 'number') {
    return expr
  }
  if (!Array.isArray(expr) || expr[0] !== 'interpolate') {
    return calculateLinearTextSize(expr, zoom)
  }
  const [, , input, ...stops] = expr
  if (input[0] !== 'zoom') {
    throw new Error('Only zoom-based expressions supported')
  }
  for (let i = 0; i < stops.length - 2; i += 2) {
    const z0 = stops[i]
    const v0 = stops[i + 1]
    const z1 = stops[i + 2]
    const v1 = stops[i + 3] // NOSONAR: array index offset for interpolation pairs
    if (zoom <= z0) {
      return v0
    }
    if (zoom <= z1) {
      return v0 + (v1 - v0) * ((zoom - z0) / (z1 - z0))
    }
  }
  return stops[stops.length - 1]
}

export function getHighlightColors(isDarkStyle) {
  if (isDarkStyle) {
    return { text: '#ffffff', halo: '#000000' }
  }
  return { text: '#000000', halo: '#ffffff' }
}

export function extractTextPropertyName(textField) {
  if (typeof textField === 'string') {
    return /^{(.+)}$/.exec(textField)?.[1]
  }
  if (Array.isArray(textField)) {
    return textField.find(e => Array.isArray(e) && e[0] === 'get')?.[1]
  }
  return null
}

export function buildLabelFromFeature(feature, layer, propName, map) {
  const center = getGeometryCenter(feature.geometry)
  if (!center) {
    return null
  }
  const projected = map.project({ lng: center[0], lat: center[1] })
  return { text: feature.properties[propName], x: projected.x, y: projected.y, feature, layer }
}

export function buildLabelsFromLayers(map, symbolLayers, features) {
  return symbolLayers.flatMap(layer => {
    const textField = layer.layout?.['text-field']
    const propName = extractTextPropertyName(textField)
    if (!propName) {
      return []
    }
    return features
      .filter(f => f.layer.id === layer.id && f.properties?.[propName])
      .map(f => buildLabelFromFeature(f, layer, propName, map))
      .filter(Boolean)
  })
}

export function findClosestLabel(labels, centerPoint) {
  return labels.reduce((best, label) => {
    const dist = (label.x - centerPoint.x) ** 2 + (label.y - centerPoint.y) ** 2
    if (!best || dist < best.dist) {
      return { label, dist }
    }
    return best
  }, null)?.label
}

export function createHighlightLayerConfig(sourceLayer, highlightSize, colors) {
  return {
    id: `highlight-${sourceLayer.id}`,
    type: sourceLayer.type,
    source: HIGHLIGHT_LABEL_SOURCE,
    layout: {
      ...sourceLayer.layout,
      'text-size': highlightSize,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-max-angle': 90
    },
    paint: {
      ...sourceLayer.paint,
      'text-color': colors.text,
      'text-halo-color': colors.halo,
      'text-halo-width': 3,
      'text-halo-blur': 1,
      'text-opacity': 1
    }
  }
}

export function removeHighlightLayer(map, state) {
  if (state.highlightLayerId && map.getLayer(state.highlightLayerId)) {
    try {
      map.removeLayer(state.highlightLayerId)
    }
    catch {}
    state.highlightLayerId = null
    state.highlightedExpr = null
  }
}

export function applyHighlight(map, labelData, state) {
  if (!labelData?.feature?.layer) {
    return
  }
  removeHighlightLayer(map, state)
  const { feature, layer } = labelData
  state.highlightLayerId = `highlight-${layer.id}`

  const { id, type, properties, geometry } = feature
  map.getSource(HIGHLIGHT_LABEL_SOURCE).setData({ id, type, properties, geometry })
  state.highlightedExpr = layer.layout['text-size']

  const zoom = map.getZoom()
  const baseSize = evalInterpolate(state.highlightedExpr, zoom)
  const highlightSize = baseSize * HIGHLIGHT_SCALE_FACTOR
  const colors = getHighlightColors(state.isDarkStyle)
  const layerConfig = createHighlightLayerConfig(layer, highlightSize, colors)

  map.addLayer(layerConfig)
  map.moveLayer(state.highlightLayerId)
}

export function navigateToNextLabel(direction, state) {
  if (!state.currentPixel) {
    return null
  }
  const filtered = state.labels
    .map((l, i) => ({ pixel: [l.x, l.y], index: i }))
    .filter(l => l.pixel[0] !== state.currentPixel.x || l.pixel[1] !== state.currentPixel.y)
  if (!filtered.length) {
    return null
  }
  const pixelArray = filtered.map(l => l.pixel)
  let nextFilteredIndex = spatialNavigate(direction, [state.currentPixel.x, state.currentPixel.y], pixelArray)
  if (nextFilteredIndex == null || nextFilteredIndex < 0 || nextFilteredIndex >= filtered.length) {
    nextFilteredIndex = 0
  }
  return state.labels[filtered[nextFilteredIndex].index]
}

function initLabelSource(map) {
  if (!map.getSource(HIGHLIGHT_LABEL_SOURCE)) {
    map.addSource(HIGHLIGHT_LABEL_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }
}

function setLineCenterPlacement(map) {
  map.getStyle().layers
    .filter(l => l.layout?.['symbol-placement'] === 'line')
    .forEach(l => map.setLayoutProperty(l.id, 'symbol-placement', 'line-center'))
}

function setSymbolTextOpacity(map) {
  map.getStyle().layers
    .filter(l => l.type === 'symbol')
    .forEach(layer => {
      map.setPaintProperty(layer.id, 'text-opacity', ['case', ['boolean', ['feature-state', 'highlighted'], false], 0, 1])
    })
}

export function createMapLabelNavigator(map, mapColorScheme, events, eventBus) {
  const state = {
    isDarkStyle: mapColorScheme === 'dark',
    labels: [],
    currentPixel: null,
    highlightLayerId: null,
    highlightedExpr: null
  }

  setLineCenterPlacement(map)
  initLabelSource(map)

  eventBus?.on(events.MAP_SET_STYLE, style => {
    map.once('styledata', () => map.once('idle', () => {
      setLineCenterPlacement(map)
      initLabelSource(map)
      state.isDarkStyle = style?.mapColorScheme === 'dark'
    }))
  })

  map.on('zoom', () => {
    if (state.highlightLayerId && state.highlightedExpr) {
      const baseSize = evalInterpolate(state.highlightedExpr, map.getZoom())
      map.setLayoutProperty(state.highlightLayerId, 'text-size', baseSize * HIGHLIGHT_SCALE_FACTOR)
    }
  })

  function refreshLabels() {
    const symbolLayers = map.getStyle().layers.filter(l => l.type === 'symbol')
    const features = map.queryRenderedFeatures({ layers: symbolLayers.map(l => l.id) })
    state.labels = buildLabelsFromLayers(map, symbolLayers, features)
  }

  function highlightCenter() {
    refreshLabels()
    if (!state.labels.length) {
      return null
    }
    const centerPoint = map.project(map.getCenter())
    const closest = findClosestLabel(state.labels, centerPoint)
    if (closest) {
      state.currentPixel = { x: closest.x, y: closest.y }
    }
    applyHighlight(map, closest, state)
    return `${closest.text} (${closest.layer.id})`
  }

  function highlightNext(direction) {
    refreshLabels()
    if (!state.labels.length) {
      return null
    }
    if (!state.currentPixel) {
      return highlightCenter()
    }
    const labelData = navigateToNextLabel(direction, state)
    if (!labelData) {
      return null
    }
    state.currentPixel = { x: labelData.x, y: labelData.y }
    applyHighlight(map, labelData, state)
    return `${labelData.text} (${labelData.layer.id})`
  }

  setSymbolTextOpacity(map)

  return {
    refreshLabels,
    highlightNextLabel: highlightNext,
    highlightLabelAtCenter: highlightCenter,
    clearHighlightedLabel: () => removeHighlightLayer(map, state)
  }
}
