import { datasetRegistry } from './datasetRegistry.js'
import { isVisibleWhen } from './isVisibleWhen.js'
import { hasCustomVisualStyle } from '../initialise/defaults.js'
import { hasPattern, hashString } from '../../../../src/utils/patternUtils.js'
import { DynamicGeoJson } from './dynamicGeoJson.js'
import { calculateOpacity, getGlobalVisibility } from './globalDataset.js'

export class Dataset {
  constructor (dataset) {
    this._datasetDefinition = dataset
  }

  get id () { return this._datasetDefinition.id }
  get label () { return this._datasetDefinition.label }
  get hasSymbol () { return !this.hasSublayers && Boolean(this.style?.symbol) }
  get hasPattern () { return !this.hasSublayers && !this.hasSymbol && hasPattern(this.style) }
  get hasFill () { return !this.hasSublayers && !this.hasSymbol && (this.hasPattern || (this.style?.fill && this.style?.fill !== 'transparent')) }
  get hasStroke () { return !this.hasSublayers && !this.hasSymbol && Boolean(this.style?.stroke) }
  get tiles () { return this._datasetDefinition.tiles }
  get geojson () { return this._datasetDefinition.geojson }
  get idProperty () { return this._datasetDefinition.idProperty }
  get generateIds () { return this._datasetDefinition.generateIds }
  get parentId () { return this._datasetDefinition.parentId }
  get minZoom () { return this._datasetDefinition.minZoom || this.parent?.minZoom }
  get maxZoom () { return this._datasetDefinition.maxZoom || this.parent?.maxZoom }
  get type () { return this._datasetDefinition.type || this.parent?.type }

  get showInKey () {
    const own = this._datasetDefinition.showInKey
    if (own !== undefined) { return own }
    return this.parent?.showInKey ?? false
  }

  // Note visibleWhen is used in combination with visible.
  // both must be true for the dataset to be visible.
  // visibleWhen is used to show/hide datasets based on mapStyle.
  get visibleWhen () {
    if (this._datasetDefinition.visibleWhen === undefined) {
      return this.parent?.visibleWhen
    }
    return this._datasetDefinition.visibleWhen
  }

  // A sublayer effectively has a groupLabel, even if it or its parent doesn't,
  // as it will be grouped with its siblings under the parents label if it doesn't.
  get groupLabel () { return this._datasetDefinition.groupLabel || this.parent?.groupLabel || this.parent?.label }

  get groupId () {
    const groupId = this._datasetDefinition.groupId || this.parent?.groupId
    if (groupId) {
      return groupId
    }
    return this.groupLabel ? this.groupLabel.toLowerCase().replace(/\s+/g, '-') : null
  }

  get opacity () {
    const myOpacity = this.style?.opacity
    const parentOpacity = this.parent?.style?.opacity
    return calculateOpacity(myOpacity, parentOpacity)
  }

  get hasDynamicGeoJSON () {
    return Boolean(this._datasetDefinition.dynamicGeoJSON)
  }

  get dynamicGeoJSON () {
    return new DynamicGeoJson({
      ...this._datasetDefinition.dynamicGeoJSON,
      id: this.id,
      minZoom: this.minZoom
    })
  }

  get hiddenFeatures () { return this._datasetDefinition.hiddenFeatures }
  get hasHiddenFeatures () { return Boolean(this.hiddenFeatures?.length > 0 || this.parent?.hasHiddenFeatures) }

  // Expression shape (get/in/literal/to-string/all/!) is shared by every adapter that speaks
  // Mapbox-style filter expressions — both MapLibre and OL's ol/expr use the same operator names.
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

  /**
   * Sourced-map-layer ids this dataset renders to, for a dataset/sublayer with no sublayers
   * of its own. Adapter-specific: MapLibre needs up to three (fill/stroke/symbol are separate
   * layers); OL needs at most one (a single style can combine fill+stroke or an icon).
   * Base implementation returns none — override in an adapter's Dataset subclass to enable
   * layerIds/getLayersWith*.
   * @returns {string[]}
   */
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
          // A sublayer can legitimately contribute nothing — e.g. an OL sublayer whose only
          // style is a symbol, which isn't renderable there yet (leafLayerIds is empty) —
          // so don't assume [0] is always a real entry.
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

  // Returns true if either the parent (if it has one) or global visibility is hidden , otherwise returns true.
  // This is used to determine whether to show a tooltip
  get isHiddenByInheritance () {
    if (this.isSublayer) {
      return !this.parent?.visible
    }
    return !getGlobalVisibility()
  }

  // Returns true if this dataset is visible based on its own visibility setting,
  // even if globalVisibility is false or its parent is not visible.
  // This is used to determine whether the dataset is rendered as checked when
  // disabled in the layers menu.
  get isLocallyVisible () {
    if (this.isVisible) {
      return true
    }
    return this._datasetDefinition.visible
  }

  get visible () {
    if (this.isSublayer) {
      return this._datasetDefinition.visible && (this.parent?.visible)
    }
    return this._datasetDefinition.visible && getGlobalVisibility()
  }

  get esriStyleLayerId () { return this._datasetDefinition.esriStyleLayerId }

  get visibility () {
    const { visible, visibleWhen } = this
    if (visible && visibleWhen) {
      return isVisibleWhen(visibleWhen) ? 'visible' : 'none'
    }
    return visible ? 'visible' : 'none'
  }

  get keyVisibility () {
    return this.showInKey && this.visibility === 'visible'
  }

  get symbolAnchor () {
    if (this.style?.symbolAnchor) {
      return this.style.symbolAnchor
    }
    return this.parent?.symbolAnchor
  }

  get sourceLayer () {
    if (this.isSublayer) {
      return this.parent.sourceLayer
    }
    if (this.tiles) {
      return this._datasetDefinition.sourceLayer
    }
    return undefined
  }

  get isSublayer () {
    return Boolean(this._datasetDefinition.parentId)
  }

  get hasSublayers () {
    return this._datasetDefinition.sublayerIds?.length > 0
  }

  get sublayerIds () {
    return this._datasetDefinition.sublayerIds
  }

  get sublayers () {
    const { sublayerIds } = this
    if (sublayerIds) {
      return sublayerIds.map(id => datasetRegistry.getDataset(id))
    }
    return []
  }

  get parent () {
    if (this._datasetDefinition.parentId) {
      return datasetRegistry.getDataset(this._datasetDefinition.parentId)
    }
    return undefined
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

  get style () {
    const parentStyle = this.parent?.style
    if (parentStyle) {
      // Here - we must set the merge styles opacity to undefined before the specific child opacity
      // so that we can correctly calculate opacity in the Dataset.opacity getter
      // - otherwise if opacity mode multiply is set,
      // any child with a parent opacity only would be multiplied by itself
      return {
        ...parentStyle,
        opacity: undefined, // NOSONAR - we need to set this to undefined so that the opacity getter can calculate the correct opacity
        ...this._datasetDefinition.style,
        symbolDescription: this.symbolDescription
      }
    }
    return this._datasetDefinition.style || {}
  }

  get hasCustomVisualStyle () {
    return hasCustomVisualStyle(this._datasetDefinition.style || {})
  }

  get symbolDescription () {
    if (this._datasetDefinition.style?.symbolDescription) {
      return this._datasetDefinition.style.symbolDescription
    }
    if (this.hasCustomVisualStyle) {
      return undefined
    }
    return this.parent?.symbolDescription
  }

  get patternConfigs () {
    const stylePatterns = this.hasPattern ? [this.style] : []
    if (this.hasSublayers) {
      return [...stylePatterns, ...this.sublayers.flatMap(sublayer => sublayer.patternConfigs)]
    }
    return stylePatterns
  }

  get symbolConfigs () {
    const styleSymbols = this.hasSymbol ? [this.style] : []
    if (this.hasSublayers) {
      return [...styleSymbols, ...this.sublayers.flatMap(sublayer => sublayer.symbolConfigs)]
    }
    return styleSymbols
  }

  get keyDefinition () {
    return {
      id: this.id,
      type: 'dataset',
      label: this.label,
      hasSymbol: this.hasSymbol,
      hasPattern: this.hasPattern,
      style: this.style,
      symbolDescription: this.symbolDescription
    }
  }
}
