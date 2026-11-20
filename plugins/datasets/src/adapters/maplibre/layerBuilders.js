import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'
import { logger } from '../../../../../src/services/logger.js'

const EMPTY_FEATURE_COLLECTION = { type: 'FeatureCollection', features: [] }
const MIN_MAPLIBRE_ZOOM = 0
const MAX_MAPLIBRE_ZOOM = 24

// ─── Zoom ─────────────────────────────────────────────────────────────────────

const unchanged = spec => spec

// Converts an API zoom, which datasets use, to MapLibre's own. They only differ on a map in EPSG:27700.
const createZoomConverter = (mapProvider) => mapProvider.zoomOffset
  ? zoom => Math.min(Math.max(mapProvider.toMapLibreZoom(zoom), MIN_MAPLIBRE_ZOOM), MAX_MAPLIBRE_ZOOM)
  : zoom => zoom

const convertZoomRange = (spec, convertZoom) => ({
  ...spec,
  ...(spec.minzoom !== undefined && { minzoom: convertZoom(spec.minzoom) }),
  ...(spec.maxzoom !== undefined && { maxzoom: convertZoom(spec.maxzoom) })
})

// Converts a vector tile source's minzoom and maxzoom to MapLibre's own zooms
const createSourceZoomRangeConverter = (mapProvider) => {
  const convertZoom = createZoomConverter(mapProvider)
  return spec => convertZoomRange(spec, convertZoom)
}

/**
 * Converts a layer's minzoom and maxzoom to MapLibre's own zooms. A layer is hidden from its
 * maxzoom up, so a maxzoom at MapLibre's highest zoom is left off: the layer would otherwise
 * disappear at the map's closest zoom instead of never.
 */
const createLayerZoomRangeConverter = (mapProvider) => {
  const convertZoom = createZoomConverter(mapProvider)
  return spec => {
    const { maxzoom, ...converted } = convertZoomRange(spec, convertZoom)
    return maxzoom === undefined || maxzoom >= MAX_MAPLIBRE_ZOOM ? converted : { ...converted, maxzoom }
  }
}

// ─── Source ───────────────────────────────────────────────────────────────────

const isLngLatMap = (mapProvider) => !mapProvider.crs || mapProvider.crs === 'EPSG:4326'

// Fetches a GeoJSON URL and passes its features, converted to lng/lat, to the source
const populateFromUrl = (mapProvider, sourceId, url) => {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }
      return response.json()
    })
    .then(geojson => mapProvider.map.getSource(sourceId)?.setData(mapProvider.geojsonToLngLat(geojson)))
    .catch(error => logger.warn(`MapLibre datasets adapter: failed to fetch geojson for source "${sourceId}" — ${error.message}`))
}

/**
 * Adds a dataset's source. GeoJSON is given in the map's CRS, but MapLibre's sources take lng/lat,
 * so on a map in another CRS it's converted first. A GeoJSON URL is fetched here on such a map,
 * since MapLibre would read its coordinates as lng/lat.
 */
const addSource = (mapProvider, sourceId, source) => {
  const { map } = mapProvider
  if (source.type === 'vector') {
    map.addSource(sourceId, createSourceZoomRangeConverter(mapProvider)(source))
    return
  }
  if (source.type !== 'geojson' || isLngLatMap(mapProvider)) {
    map.addSource(sourceId, source)
    return
  }
  if (typeof source.data === 'string') {
    map.addSource(sourceId, { ...source, data: EMPTY_FEATURE_COLLECTION })
    populateFromUrl(mapProvider, sourceId, source.data)
    return
  }
  map.addSource(sourceId, { ...source, data: mapProvider.geojsonToLngLat(source.data) })
}

// ─── Fill layer ───────────────────────────────────────────────────────────────

export const addFillLayer = (map, registryDataset, mapStyleId, patternRegistry, pixelRatio = 1, toMapLibreZoomRange = unchanged) => {
  const { hasFill, fillLayerId } = registryDataset
  if (!(hasFill && fillLayerId) || map.getLayer(fillLayerId)) {
    return
  }
  const patternImageId = patternRegistry.getPatternImageId(registryDataset.style, mapStyleId, pixelRatio)
  const paint = patternImageId
    ? { 'fill-pattern': patternImageId, 'fill-opacity': registryDataset.opacity }
    : { 'fill-color': getValueForStyle(registryDataset.style.fill, mapStyleId), 'fill-opacity': registryDataset.opacity }
  map.addLayer(toMapLibreZoomRange(registryDataset.getFillSource(paint)))
}

// ─── Stroke layer ─────────────────────────────────────────────────────────────

export const addStrokeLayer = (map, registryDataset, mapStyleId, toMapLibreZoomRange = unchanged) => {
  const { hasStroke, strokeLayerId } = registryDataset

  if (!hasStroke || map.getLayer(strokeLayerId)) {
    return
  }
  const paint = {
    'line-color': getValueForStyle(registryDataset.style.stroke, mapStyleId),
    'line-width': registryDataset.style.strokeWidth,
    'line-opacity': registryDataset.opacity,
    ...(registryDataset.style.strokeDashArray ? { 'line-dasharray': registryDataset.style.strokeDashArray } : {})
  }
  const strokeSource = registryDataset.getStrokeSource(paint)
  map.addLayer(toMapLibreZoomRange(strokeSource))
}

// ─── Symbol layer ─────────────────────────────────────────────────────────────

export const addSymbolLayer = (mapProvider, registryDataset, mapStyle, symbolRegistry, pixelRatio) => {
  const { map } = mapProvider
  const { hasSymbol, symbolLayerId } = registryDataset
  if (!hasSymbol || !symbolRegistry || !symbolLayerId || map.getLayer(symbolLayerId)) { return }
  const symbolDef = symbolRegistry.getSymbolDef(registryDataset.style)
  if (!symbolDef) { return }
  const imageId = symbolRegistry.getSymbolImageId(registryDataset.style, mapStyle, 'normal', pixelRatio)
  if (!imageId) { return }
  const symbolSource = registryDataset.getSymbolSource(imageId, mapProvider.getSymbolIconLayout(symbolDef))
  map.addLayer(createLayerZoomRangeConverter(mapProvider)(symbolSource))
}

// ─── Dataset layers ───────────────────────────────────────────────────────────

/**
 * Add all layers (and source if needed) for a dataset.
 * Returns the sourceId so the caller can track the datasetId → sourceId mapping.
 * @param {Object} mapProvider - MapLibreProvider (its map, and symbol icon placement)
 * @param {Object} registryDataset
 * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
 * @param {Object} symbolRegistry
 * @param {Object} patternRegistry
 * @param {number} pixelRatio - Device pixel ratio × map size scale factor
 * @returns {string} sourceId
 */
export const addDatasetLayers = (mapProvider, registryDataset, mapStyle, symbolRegistry, patternRegistry, pixelRatio) => {
  const { map } = mapProvider
  const { sourceId, source } = registryDataset
  if (source && !map.getSource(sourceId)) {
    addSource(mapProvider, sourceId, source)
  }
  const mapStyleId = mapStyle.id
  addSymbolLayer(mapProvider, registryDataset, mapStyle, symbolRegistry, pixelRatio)
  const toMapLibreZoomRange = createLayerZoomRangeConverter(mapProvider)
  addFillLayer(map, registryDataset, mapStyleId, patternRegistry, pixelRatio, toMapLibreZoomRange)
  addStrokeLayer(map, registryDataset, mapStyleId, toMapLibreZoomRange)

  if (registryDataset.sublayers?.length) {
    registryDataset.sublayers.forEach(sublayer => {
      addDatasetLayers(mapProvider, sublayer, mapStyle, symbolRegistry, patternRegistry, pixelRatio)
    })
    return sourceId
  }

  if (registryDataset.isSublayer) {
    return undefined
  }
  return sourceId
}
