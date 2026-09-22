import { MapboxStyleDataset } from '../../../registry/mapboxStyleDataset.js'
import { anchorToMaplibre } from '../../../../../../providers/maplibre/src/utils/symbolImages.js'
import { logger } from '../../../../../../src/services/logger.js'
const MAX_TILE_ZOOM = 22

export class MapLibreDataset extends MapboxStyleDataset {
  get fillLayerId () {
    if (this.hasSublayers) {
      return null
    }
    if (this.hasSymbol) {
      return null
    }
    if (this.hasFill) {
      return this.id
    }
    return null
  }

  get strokeLayerId () {
    if (this.hasSublayers) {
      return null
    }
    if (this.hasSymbol) {
      return null
    }
    if (this.hasStroke) {
      return this.hasFill ? `${this.id}-stroke` : this.id
    }
    return null
  }

  get symbolLayerId () {
    if (this.hasSublayers) {
      return null
    }
    if (this.hasSymbol) {
      return this.id
    }
    return null
  }

  get leafLayerIds () {
    return [this.symbolLayerId, this.fillLayerId, this.strokeLayerId].filter(Boolean)
  }

  _geojsonIdStrategy () {
    if (this.idProperty) { return { promoteId: this.idProperty } }
    if (this.generateIds) { return { generateId: true } }
    if (this.geojson?.features?.some(f => typeof f.id === 'string')) {
      logger.warn(`Dataset "${this.id}" has GeoJSON features with string native IDs. MapLibre only surfaces integer native feature IDs through queryRenderedFeatures. Use idProperty to promote a string property instead.`)
    }
    return {}
  }

  get source () {
    if (this.hasDynamicGeoJSON) { return this.dynamicGeoJSON.source }
    if (this.tiles) {
      const source = {
        type: 'vector',
        tiles: this.tiles,
        minzoom: this.minZoom || 0,
        maxzoom: this.maxZoom || MAX_TILE_ZOOM
      }
      if (this.idProperty && this.sourceLayer) {
        source.promoteId = { [this.sourceLayer]: this.idProperty }
      }
      return source
    }
    if (this.geojson) {
      return { type: 'geojson', data: this.geojson, ...this._geojsonIdStrategy() }
    }
    return null
  }

  getSymbolSource (imageId, anchor, symbolDef) {
    return {
      id: this.symbolLayerId,
      type: 'symbol',
      source: this.sourceId,
      'source-layer': this.sourceLayer,
      minzoom: this.minZoom,
      maxzoom: this.maxZoom,
      layout: {
        visibility: this.visibility,
        'icon-image': imageId,
        'icon-anchor': anchorToMaplibre(anchor || symbolDef?.anchor || [0.5, 0.5]),
        'icon-allow-overlap': true
      },
      ...(this.filter ? { filter: this.filter } : {})
    }
  }

  getFillSource (paint) {
    return {
      id: this.fillLayerId,
      type: 'fill',
      source: this.sourceId,
      'source-layer': this.sourceLayer,
      minzoom: this.minZoom,
      maxzoom: this.maxZoom,
      layout: { visibility: this.visibility },
      paint,
      ...(this.filter ? { filter: this.filter } : {})
    }
  }

  getStrokeSource (paint) {
    return {
      id: this.strokeLayerId,
      type: 'line',
      source: this.sourceId,
      'source-layer': this.sourceLayer,
      minzoom: this.minZoom,
      maxzoom: this.maxZoom,
      layout: { visibility: this.visibility },
      paint,
      ...(this.filter ? { filter: this.filter } : {})
    }
  }
}
