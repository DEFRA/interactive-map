import { Dataset } from '../../../registry/dataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'
import { getValueForStyle } from '../../../../../../../src/utils/getValueForStyle.js'

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
}
