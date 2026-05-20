import { datasetRegistry } from './datasetRegistry.js'
import { hasCustomVisualStyle } from '../defaults.js'
import { hasPattern } from '../../../../../src/utils/patternUtils.js'

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
  get transformRequest () { return this._datasetDefinition.transformRequest }
  get parentId () { return this._datasetDefinition.parentId }

  get minZoom () { return this._datasetDefinition.minZoom || this.parent?.minZoom }
  get maxZoom () { return this._datasetDefinition.maxZoom || this.parent?.maxZoom }
  get filter () { return this._datasetDefinition.filter || this.parent?.filter }
  get showInKey () { return this._datasetDefinition.showInKey || this.parent?.showInKey || false }
  get groupLabel () { return this._datasetDefinition.groupLabel }

  get visibility () { return this.visible ? 'visible' : 'none' }

  get visible () {
    if (this.isSublayer) {
      return this._datasetDefinition.visible && (this.parent?.visible)
    }
    return this._datasetDefinition.visible
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
      return { ...parentStyle, ...this._datasetDefinition.style, symbolDescription: this.symbolDescription }
    }
    return this._datasetDefinition.style
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
