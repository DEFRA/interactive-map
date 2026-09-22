import { Dataset } from './dataset.js'
import { hashString } from '../../../../src/utils/patternUtils.js'

/**
 * Adds the Mapbox Style Spec's declarative model on top of Dataset: filter expressions,
 * the sources/layers split (sourceId/leafLayerIds/layerIds), and aggregating opacity/
 * visibility/filters across layers. Shared by MapLibre and OpenLayers (both speak this
 * expression dialect); Esri has no equivalent, so EsriDataset extends Dataset directly.
 */
export class MapboxStyleDataset extends Dataset {
  get _hiddenFeaturesIdExpression () {
    if (this.hasDynamicGeoJSON) {
      return this.dynamicGeoJSON.hiddenFeaturesIdExpression
    }
    if (this.idProperty) {
      return ['to-string', ['get', this.idProperty]]
    }
    return ['to-string', ['id']]
  }

  get _hiddenFeaturesFilter () {
    const hiddenFeatures = this.hiddenFeatures?.filter(id => id !== -1)
    if (!hiddenFeatures?.length) {
      return null
    }
    return ['!', ['in', this._hiddenFeaturesIdExpression, ['literal', hiddenFeatures.map(String)]]]
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

  // Layer ids this dataset renders to — override per adapter (MapLibre: up to 3; OL: at most 1).
  get leafLayerIds () {
    return []
  }

  get layerIds () {
    if (this.hasSublayers) {
      return this.sublayers.flatMap(sublayer => sublayer.layerIds).filter(Boolean)
    }
    return this.leafLayerIds
  }

  getLayersWithValue (valueName, condition = false) {
    const response = []
    if (condition === false || this[condition]) {
      const layerIds = this.leafLayerIds
      if (layerIds.length) {
        const value = this[valueName]
        response.push({ layerIds, [valueName]: value })
      }
    }

    if (this.hasSublayers) {
      this.sublayers.forEach((sublayer) => {
        if (condition === false || sublayer[condition]) {
          // A sublayer can legitimately contribute nothing (empty leafLayerIds).
          const [entry] = sublayer.getLayersWithValue(valueName)
          if (entry) {
            response.push(entry)
          }
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
}
