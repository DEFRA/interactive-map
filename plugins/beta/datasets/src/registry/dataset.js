import { datasetRegistry } from './datasetRegistry.js'
import { hasCustomVisualStyle } from '../defaults.js'

export class Dataset {
  constructor (dataset) {
    this._datasetDefinition = dataset
  }

  get isSublayer () {
    return Boolean(this._datasetDefinition.parentId)
  }

  get hasSublayers () {
    return this._datasetDefinition.sublayerIds?.length > 0
  }

  get sublayers () {
    if (this._datasetDefinition.sublayerIds) {
      return this._datasetDefinition.sublayerIds.map(id => new Dataset(datasetRegistry.getDataset(id)))
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
}
