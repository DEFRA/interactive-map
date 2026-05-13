import { datasetRegistry } from './datasetRegistry.js'
import { hasCustomVisualStyle } from '../defaults.js'
import { hasPattern } from '../../../../../src/utils/patternUtils.js'

export class Dataset {
  constructor (dataset) {
    this._datasetDefinition = dataset
  }

  get id () { return this._datasetDefinition.id }
  get hasSymbol () { return Boolean(this.style?.symbol) }
  get hasPattern () { return hasPattern(this.style) }
  get hasFill () { return this.hasPattern || (this.style?.fill && this.style?.fill !== 'transparent') }
  get hasStroke () { return Boolean(this.style?.stroke) }
  get tiles () { return this._datasetDefinition.tiles }
  get geojson () { return this._datasetDefinition.geojson }
  get sourceLayer () { return this._datasetDefinition.sourceLayer }
  get visibility () { return this._datasetDefinition.visibility || 'visible' }
  get filter () { return this._datasetDefinition.filter }
  get minZoom () { return this._datasetDefinition.minZoom }
  get maxZoom () { return this._datasetDefinition.maxZoom }

  get isSublayer () {
    return Boolean(this._datasetDefinition.parentId)
  }

  get hasSublayers () {
    return this._datasetDefinition.sublayerIds?.length > 0
  }

  get sublayers () {
    if (this._datasetDefinition.sublayerIds) {
      return this._datasetDefinition.sublayerIds.map(id => datasetRegistry.getDataset(id))
    }
    return undefined
  }

  get parent () {
    if (this._datasetDefinition.parentId) {
      return new Dataset(datasetRegistry.getDataset(this._datasetDefinition.parentId))
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
