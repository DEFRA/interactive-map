import { hasCustomVisualStyle } from '../defaults.js'

const getFillProps = (dataset, sublayerStyle) => {
  if (sublayerStyle.fillPattern || sublayerStyle.fillPatternSvgContent) {
    return {
      fillPattern: sublayerStyle.fillPattern,
      fillPatternSvgContent: sublayerStyle.fillPatternSvgContent,
      fillPatternForegroundColor: sublayerStyle.fillPatternForegroundColor ?? dataset.fillPatternForegroundColor,
      fillPatternBackgroundColor: sublayerStyle.fillPatternBackgroundColor ?? dataset.fillPatternBackgroundColor
    }
  }
  if ('fill' in sublayerStyle) {
    // Sublayer explicitly sets a plain fill — do not inherit any parent pattern
    return { fill: sublayerStyle.fill }
  }
  return {
    fill: dataset.fill,
    fillPattern: dataset.fillPattern,
    fillPatternSvgContent: dataset.fillPatternSvgContent,
    fillPatternForegroundColor: dataset.fillPatternForegroundColor,
    fillPatternBackgroundColor: dataset.fillPatternBackgroundColor
  }
}

const getCombinedFilter = (datasetFilter, sublayerFilter) => {
  if (datasetFilter && sublayerFilter) {
    return ['all', datasetFilter, sublayerFilter]
  }
  return sublayerFilter || datasetFilter || null
}

const getSymbolDescription = (dataset, sublayerStyle) => {
  if ('symbolDescription' in sublayerStyle) {
    return sublayerStyle.symbolDescription
  }
  if (hasCustomVisualStyle(sublayerStyle)) {
    return undefined
  }
  return dataset.symbolDescription
}

/**
 * Merge a sublayer with its parent dataset, producing a flat style
 * object suitable for layer creation and key symbol rendering.
 *
 * The sublayer's nested `style` object is flattened before merging.
 *
 * Fill precedence (highest to lowest):
 *   1. Sublayer's own fillPattern
 *   2. Sublayer's own fill (explicit, even if transparent — clears any parent pattern)
 *   3. Parent's fillPattern
 *   4. Parent's fill
 *
 * symbolDescription is only inherited from the parent when the sublayer has no
 * custom visual styles of its own. If the sublayer overrides stroke/fill/pattern
 * without setting symbolDescription explicitly, no description is shown.
 */
export const mergeSublayer = (dataset, sublayer) => {
  const sublayerStyle = sublayer.style || {}
  const combinedFilter = getCombinedFilter(dataset.filter, sublayer.filter)

  return {
    id: sublayer.id,
    label: sublayer.label,
    stroke: sublayerStyle.stroke ?? dataset.stroke,
    strokeWidth: sublayerStyle.strokeWidth ?? dataset.strokeWidth,
    strokeDashArray: sublayerStyle.strokeDashArray ?? dataset.strokeDashArray,
    opacity: sublayerStyle.opacity ?? dataset.opacity,
    keySymbolShape: sublayerStyle.keySymbolShape ?? dataset.keySymbolShape,
    symbolDescription: getSymbolDescription(dataset, sublayerStyle),
    showInKey: sublayer.showInKey ?? dataset.showInKey,
    toggleVisibility: sublayer.toggleVisibility ?? false,
    filter: combinedFilter,
    minZoom: dataset.minZoom,
    maxZoom: dataset.maxZoom,
    symbol: sublayerStyle.symbol ?? dataset.symbol,
    ...getFillProps(dataset, sublayerStyle)
  }
}
