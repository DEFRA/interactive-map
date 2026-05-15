import { Dataset } from '../../../registry/dataset.js'
import { MAX_TILE_ZOOM, hashString } from '../layerIds.js'
import { anchorToMaplibre } from '../symbolImages.js'

export class MapLibreDataset extends Dataset {
  get isDynamicSource () {
    return typeof this.geojson === 'string' && !!this.idProperty && typeof this.transformRequest === 'function'
  }

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

  get layerIds () {
    if (this.hasSublayers) {
      return this.sublayers.flatMap(sublayer => sublayer.layerIds).filter(Boolean)
    }
    return [this.symbolLayerId, this.fillLayerId, this.strokeLayerId].filter(Boolean)
  }

  get sourceId () {
    if (this.isSublayer) { return this.parent.sourceId }
    if (this.tiles) {
      const tilesKey = Array.isArray(this.tiles) ? this.tiles.join(',') : this.tiles
      return `tiles-${hashString(tilesKey)}`
    }
    if (this.geojson) {
      if (this.isDynamicSource) { return `geojson-dynamic-${this.id}` }
      if (typeof this.geojson === 'string') { return `geojson-${hashString(this.geojson)}` }
      return `geojson-${this.id}`
    }
    return `source-${this.id}`
  }

  get source () {
    if (this.tiles) {
      return {
        type: 'vector',
        tiles: this.tiles,
        minzoom: this.minZoom || 0,
        maxzoom: this.maxZoom || MAX_TILE_ZOOM
      }
    }
    if (this.geojson) {
      const data = this.isDynamicSource ? { type: 'FeatureCollection', features: [] } : this.geojson
      return { type: 'geojson', data, generateId: true }
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
        visibility: this.visibility === 'hidden' ? 'none' : 'visible',
        'icon-image': imageId,
        'icon-anchor': anchorToMaplibre(anchor || symbolDef?.anchor || [0.5, 0.5]),
        'icon-allow-overlap': true
      },
      ...(this.filter ? { filter: this.filter } : {})
    }
  }
}
