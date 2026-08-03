import { Dataset } from '../../../registry/dataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'
import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'

export class EsriDataset extends Dataset {
  applyLayerPaintProperties (layerPaintProperties) {
    const { mapStyle } = datasetRegistry
    if (this.hasStroke) {
      layerPaintProperties['line-color'] = getValueForStyle(this.style.stroke, mapStyle.id)
    }
    if (this.hasFill) {
      layerPaintProperties['fill-color'] = getValueForStyle(this.style.fill, mapStyle.id)
    }
    return layerPaintProperties
  }

  get esriGroupId () {
    if (this._datasetDefinition.esriGroupId === undefined) {
      return this.parent?.esriGroupId
    }
    return this._datasetDefinition.esriGroupId
  }

  get useServerStyle () {
    return Boolean(this._datasetDefinition.esriUseServerStyle)
  }

  get renderer () {
    if (this.type !== 'FeatureService') {
      return undefined
    }
    const rendererDefinition = this._datasetDefinition.style?.renderer || this.parent?.renderer
    if (!rendererDefinition) {
      return undefined
    }
    const { mapStyle } = datasetRegistry
    const renderer = JSON.parse(JSON.stringify(rendererDefinition))
    if (renderer.symbol?.color) {
      renderer.symbol.color = getValueForStyle(renderer.symbol.color, mapStyle.id)
    }
    if (renderer.symbol?.outline?.color) {
      renderer.symbol.outline.color = getValueForStyle(renderer.symbol.outline.color, mapStyle.id)
    }
    return renderer
  }
}
