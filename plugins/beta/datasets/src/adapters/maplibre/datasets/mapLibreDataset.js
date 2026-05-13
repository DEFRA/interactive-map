import { Dataset } from '../../../registry/dataset.js'

export class MapLibreDataset extends Dataset {
  get layerIds () {
    if (this.hasSublayers) {
      return this.sublayers.flatMap(sublayer => sublayer.layerIds).filter(Boolean)
    }

    if (this.hasSymbol) {
      return [this.id]
    }
    const { hasFill, hasStroke } = this
    if (hasFill && hasStroke) {
      return [this.id, `${this.id}-stroke`]
    }

    if (hasFill || hasStroke) {
      return [this.id]
    }
    return null
  }
}
