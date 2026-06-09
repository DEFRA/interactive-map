import { datasetRegistry } from './datasetRegistry.js'
import { hasCustomVisualStyle } from '../initialise/defaults.js'
import { hasPattern } from '../../../../../src/utils/patternUtils.js'
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
  // TODO - handle transformRequest for non-dynamicGeoJSON as well (e.g. to add auth headers) --- IGNORE ---
  // get transformRequest () { return this._datasetDefinition.transformRequest }
  get parentId () { return this._datasetDefinition.parentId }
  get minZoom () { return this._datasetDefinition.minZoom || this.parent?.minZoom }
  get maxZoom () { return this._datasetDefinition.maxZoom || this.parent?.maxZoom }
  get showInKey () { return this._datasetDefinition.showInKey || this.parent?.showInKey || false }
  get groupLabel () { return this._datasetDefinition.groupLabel }

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

  get filter () {
    return null // TODO - implement filter construction for esri and openLayers adapters
  }

  // Returns true if either the parent (if it has one) or global visibility is hidden , otherwise returns true.
  // This is used to determine whether to show a tooltip
  // TODO: also work out how to convey datasets hidden by zoom filter.
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
    return undefined
  }

  get parent () {
    if (this._datasetDefinition.parentId) {
      return datasetRegistry.getDataset(this._datasetDefinition.parentId)
    }
    return undefined
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
        opacity: undefined,
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
}
