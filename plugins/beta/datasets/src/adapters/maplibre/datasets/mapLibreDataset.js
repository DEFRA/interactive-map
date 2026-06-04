import { Dataset } from '../../../registry/dataset.js'
import { MAX_TILE_ZOOM, hashString } from '../layerIds.js'
import { anchorToMaplibre } from '../../../../../../../providers/maplibre/src/utils/symbolImages.js'

export class MapLibreDataset extends Dataset {
  get visibility () { return this.visible ? 'visible' : 'none' }

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

  getLayersWithValue (valueName, condition = false) {
    const response = []
    if (condition === false || this[condition]) {
      const layerIds = [this.symbolLayerId, this.fillLayerId, this.strokeLayerId].filter(Boolean)
      if (layerIds.length) {
        const value = this[valueName]
        response.push({ layerIds, [valueName]: value })
      }
    }

    if (this.hasSublayers) {
      this.sublayers.forEach((sublayer) => {
        if (condition === false || sublayer[condition]) {
          response.push(sublayer.getLayersWithValue(valueName)[0])
        }
      })
    }
    return response
  }

  getLayersWithVisibility () {
    return this.getLayersWithValue('visibility')
  }

  getLayersWithOpacity () {
    return this.getLayersWithValue('opacity')
  }

  getLayersWithFilters () {
    return this.getLayersWithValue('filter', 'hasHiddenFeatures')
  }

  get sourceId () {
    if (this.isSublayer) { return this.parent.sourceId }
    if (this.hasDynamicGeoJSON) { return this.dynamicGeoJSON.sourceId }
    if (this.tiles) {
      const tilesKey = Array.isArray(this.tiles) ? this.tiles.join(',') : this.tiles
      return `tiles-${hashString(tilesKey)}`
    }
    if (this.geojson) {
      if (typeof this.geojson === 'string') { return `geojson-${hashString(this.geojson)}` }
      return `geojson-${this.id}`
    }
    return `source-${this.id}`
  }

  get source () {
    if (this.hasDynamicGeoJSON) {
      return this.dynamicGeoJSON.source
    }
    if (this.tiles) {
      return {
        type: 'vector',
        tiles: this.tiles,
        minzoom: this.minZoom || 0,
        maxzoom: this.maxZoom || MAX_TILE_ZOOM
      }
    }
    if (this.geojson) {
      return { type: 'geojson', data: this.geojson, generateId: true }
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

  get _hiddenFeaturesIdExpression () {
    return this.hasDynamicGeoJSON ? this.dynamicGeoJSON.hiddenFeaturesIdExpression : ['to-string', ['id']]
  }

  get _hiddenFeaturesFilter () {
    const hiddenFeatures = this.hiddenFeatures?.filter(id => id !== -1)
    if (hiddenFeatures?.length) {
      return ['!', ['in', this._hiddenFeaturesIdExpression, ['literal', hiddenFeatures.map(String)]]]
    }
    return null
  }

  get filter () {
    const filter = ['all']
    if (this.parent?.filter) {
      filter.push(this.parent.filter)
    }
    if (this._datasetDefinition.filter) {
      filter.push(this._datasetDefinition.filter)
    }
    const hiddenFeaturesFilter = this._hiddenFeaturesFilter
    if (hiddenFeaturesFilter) {
      filter.push(hiddenFeaturesFilter)
    }
    if (filter.length === 1) {
      return null
    }
    return filter.length > 2 ? filter : filter[1]
  }
}
