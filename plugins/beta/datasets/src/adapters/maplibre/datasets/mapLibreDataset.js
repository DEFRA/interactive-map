import { Dataset } from '../../../registry/dataset.js'
import { hasPattern } from '../../../../../../../src/utils/patternUtils.js'

export class MapLibreDataset extends Dataset {
  get hasSymbol () { return Boolean(this.style?.symbol) }
  get hasPattern () { return hasPattern(this.style) }
  get hasFill () { return this.hasPattern || (this.style?.fill && this.style?.fill !== 'transparent') }
  get hasStroke () { return Boolean(this.style?.stroke) }

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
