import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import Feature from 'ol/Feature.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import Style from 'ol/style/Style.js'
import Stroke from 'ol/style/Stroke.js'
import Fill from 'ol/style/Fill.js'
import Icon from 'ol/style/Icon.js'
import { collectTileFragments } from './vtTileFragments.js'
import { getCachedSymbolImage } from './symbolImages.js'
import { symbolRegistry } from '../../../../../src/services/symbolRegistry.js'
import { getSymbolAnchor } from '../../../../../src/utils/symbolUtils.js'

const CRS = 'EPSG:27700'
const geoJsonFormat = new GeoJSON({ dataProjection: CRS, featureProjection: CRS })

const HIGHLIGHT_MARKER = '_highlight'
const HIGHLIGHT_Z = 999

const buildHighlightStyles = (styleEntry, isActive) => {
  if (!styleEntry) {
    return []
  }
  const { stroke, selectionStroke, fill, strokeWidth, activeStrokeWidth } = styleEntry

  if (isActive) {
    return [
      new Style({ stroke: new Stroke({ color: stroke, width: activeStrokeWidth }), zIndex: HIGHLIGHT_Z }),
      new Style({ stroke: new Stroke({ color: selectionStroke, width: strokeWidth }), zIndex: HIGHLIGHT_Z + 1 })
    ]
  }

  const styles = [new Style({ stroke: new Stroke({ color: selectionStroke, width: strokeWidth }), zIndex: HIGHLIGHT_Z })]
  if (fill && fill !== 'transparent') {
    styles.push(new Style({ fill: new Fill({ color: fill }), zIndex: HIGHLIGHT_Z }))
  }
  return styles
}

const hasSymbolStyle = (properties) => !!(properties?.symbol || properties?.symbolSvgContent)

// A drawn point renders as a real symbol icon, not Stroke/Fill, so its selected/active ring is
// the active/selected variant of that same icon instead. Returns null (not []) for a
// non-symbol feature so the caller falls through to buildHighlightStyles.
const buildSymbolHighlightStyle = (properties, isActive) => {
  if (!hasSymbolStyle(properties)) {
    return null
  }
  const imageId = isActive ? properties.symbolActiveImageId : properties.symbolSelectedImageId
  const canvas = imageId && getCachedSymbolImage(imageId)
  if (!canvas) {
    return null
  }
  const symbolDef = symbolRegistry.getSymbolDef(properties)
  const anchor = getSymbolAnchor(properties, symbolDef)
  // The cached canvas is rasterised at symbolPixelRatio for crispness — ol/style/Icon draws
  // it at native size, so the inverse scale keeps the displayed size correct.
  const scale = 1 / (properties.symbolPixelRatio || 1)
  return [new Style({ image: new Icon({ img: canvas, anchor, scale }), zIndex: HIGHLIGHT_Z })]
}

// ---------------------------------------------------------------------------
// VectorTileLayer: style-function wrap
// Evaluated per feature per tile at render time — automatically covers all
// tiles including those that load after selection, matching MapLibre's
// filter-based behaviour.
// ---------------------------------------------------------------------------

const buildFeatureKeyIndex = (features) => {
  const keys = new Set()
  const idProps = {} // styleLayerId → idProperty

  for (const { layerId, featureId, idProperty } of features ?? []) {
    keys.add(`${layerId}:${featureId}`)
    if (idProperty) {
      idProps[layerId] = idProperty
    }
  }

  return { keys, idProps }
}

const wrapVtLayers = (map, selectedKeys, activeKeys, idPropsMap, stylesMap) => {
  map.getLayers().forEach(layer => {
    if (!(layer instanceof VectorTileLayer)) {
      return
    }

    const hasSelection = selectedKeys.size > 0 || activeKeys.size > 0

    if (!hasSelection) {
      if (layer._highlightOriginalStyle) {
        layer.setStyle(layer._highlightOriginalStyle)
        delete layer._highlightOriginalStyle
      }
      return
    }

    if (!layer._highlightOriginalStyle) {
      layer._highlightOriginalStyle = layer.getStyleFunction()
    }
    const orig = layer._highlightOriginalStyle

    layer.setStyle((feature, resolution) => {
      const base = orig(feature, resolution)
      const styleLayerId = feature.get('mapbox-layer')?.id
      if (!styleLayerId) {
        return base
      }

      const idProp = idPropsMap[styleLayerId]
      const fid = idProp ? feature.get(idProp) : feature.getId()
      const key = `${styleLayerId}:${fid}`

      const isActive = activeKeys.has(key)
      const isSelected = !isActive && selectedKeys.has(key)
      if (!isActive && !isSelected) {
        return base
      }

      const highlightStyles = buildHighlightStyles(stylesMap?.[styleLayerId], isActive)
      if (!highlightStyles.length) {
        return base
      }

      const baseArr = base ? (Array.isArray(base) ? base : [base]) : []
      return [...baseArr, ...highlightStyles]
    })
    // setStyle() calls layer.changed() internally — no source.changed() needed
    // (source.changed() works but causes a visible flicker on selection)
  })
}

// ---------------------------------------------------------------------------
// VectorLayer: overlay approach
// Non-tiled vector layers (e.g. the draw layer) have no tile-boundary issue,
// so a simple overlay Feature works correctly and needs no style-wrap.
// ---------------------------------------------------------------------------

const getOrCreateHighlightLayer = (map) => {
  let layer = null
  map.getLayers().forEach(l => {
    if (l.get(HIGHLIGHT_MARKER)) {
      layer = l
    }
  })
  if (!layer) {
    layer = new VectorLayer({ source: new VectorSource(), zIndex: HIGHLIGHT_Z + 2 })
    layer.set(HIGHLIGHT_MARKER, true)
    map.addLayer(layer)
  }
  return layer
}

// interact's selectedFeatures carry a `properties` snapshot taken at selection time, which
// goes stale for the symbol icon path once a map style change re-resolves the point's image
// ids — reading straight off the live feature avoids showing the previous theme's variant.
const getLiveProperties = (map, layerId, featureId) => {
  if (featureId == null) {
    return undefined
  }
  let properties
  map.getLayers().forEach(l => {
    if (properties || !(l instanceof VectorLayer) || l.get(HIGHLIGHT_MARKER) || l.get('layerId') !== layerId) {
      return
    }
    const feature = l.getSource()?.getFeatureById(String(featureId))
    if (feature) {
      properties = feature.getProperties()
    }
  })
  return properties
}

const addVectorHighlights = (map, source, features, isActive, stylesMap) => {
  for (const { layerId, featureId, geometry } of features ?? []) {
    if (!geometry) {
      continue
    }
    const liveProperties = getLiveProperties(map, layerId, featureId)
    const styles = buildSymbolHighlightStyle(liveProperties, isActive) ?? buildHighlightStyles(stylesMap?.[layerId], isActive)
    if (!styles.length) {
      continue
    }
    const olFeature = new Feature({ geometry: geoJsonFormat.readGeometry(geometry) })
    olFeature.setStyle(styles)
    source.addFeature(olFeature)
  }
}

// ---------------------------------------------------------------------------
// Bounds
// ---------------------------------------------------------------------------

const expandBoundsFromGeometry = (geometry, cb) => {
  const { type, coordinates } = geometry
  const visitCoord = ([x, y]) => cb(x, y)
  const visitRing = (ring) => ring.forEach(visitCoord)

  if (type === 'Point') {
    visitCoord(coordinates)
  } else if (type === 'MultiPoint' || type === 'LineString') {
    coordinates.forEach(visitCoord)
  } else if (type === 'MultiLineString' || type === 'Polygon') {
    coordinates.forEach(visitRing)
  } else if (type === 'MultiPolygon') {
    coordinates.forEach(poly => poly.forEach(visitRing))
  }
}

const resolveGeometries = (map, { layerId, featureId, idProperty, geometry }) => {
  if (featureId != null) {
    const fragments = collectTileFragments(map, layerId, featureId, idProperty)
    if (fragments.length > 0) {
      return fragments
    }
  }
  return geometry ? [geometry] : []
}

const computeBounds = (geometries) => {
  if (!geometries.length) {
    return null
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const geometry of geometries) {
    expandBoundsFromGeometry(geometry, (x, y) => {
      if (x < minX) { minX = x }
      if (y < minY) { minY = y }
      if (x > maxX) { maxX = x }
      if (y > maxY) { maxY = y }
    })
  }

  return minX === Infinity ? null : [minX, minY, maxX, maxY]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Highlight selected/active features.
 * - VectorTileLayers: style-function wrap so all tiles (including those that
 *   load after selection) render the highlight automatically.
 * - VectorLayers (draw etc.): overlay Feature at zIndex 1001.
 * Returns EPSG:27700 bounds [minX, minY, maxX, maxY] for selected features, or null.
 */
export const updateHighlightedFeatures = (map, selectedFeatures, activeFeatures, stylesMap) => {
  if (!map) {
    return null
  }

  // Determine which layerIds belong to plain VectorLayers vs VT layers
  const vectorLayerIds = new Set()
  map.getLayers().forEach(l => {
    if (l instanceof VectorLayer && !l.get(HIGHLIGHT_MARKER)) {
      const id = l.get('layerId')
      if (id) {
        vectorLayerIds.add(id)
      }
    }
  })

  // VT layers — style-wrap
  const { keys: selectedKeys, idProps: selectedIdProps } = buildFeatureKeyIndex(selectedFeatures)
  const { keys: activeKeys, idProps: activeIdProps } = buildFeatureKeyIndex(activeFeatures)
  const idPropsMap = { ...selectedIdProps, ...activeIdProps }
  wrapVtLayers(map, selectedKeys, activeKeys, idPropsMap, stylesMap)

  // VectorLayers — overlay
  const hlLayer = getOrCreateHighlightLayer(map)
  const hlSource = hlLayer.getSource()
  hlSource.clear()

  const vecSelected = (selectedFeatures ?? []).filter(f => vectorLayerIds.has(f.layerId))
  const vecActive = (activeFeatures ?? []).filter(f => vectorLayerIds.has(f.layerId))

  // VT features are handled by style-wrap; only add vector features to overlay
  addVectorHighlights(map, hlSource, vecActive, true, stylesMap)
  addVectorHighlights(map, hlSource, vecSelected, false, stylesMap)

  // Bounds from all tile fragments of selected features
  const allGeoms = (selectedFeatures ?? []).flatMap(feat => resolveGeometries(map, feat))
  return computeBounds(allGeoms)
}
