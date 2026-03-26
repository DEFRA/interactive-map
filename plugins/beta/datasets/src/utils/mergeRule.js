import { hasCustomVisualStyle } from '../defaults.js'

const getFillProps = (dataset, ruleStyle) => {
  if (ruleStyle.fillPattern || ruleStyle.fillPatternSvgContent) {
    return {
      fillPattern: ruleStyle.fillPattern,
      fillPatternSvgContent: ruleStyle.fillPatternSvgContent,
      fillPatternForegroundColor: ruleStyle.fillPatternForegroundColor ?? dataset.fillPatternForegroundColor,
      fillPatternBackgroundColor: ruleStyle.fillPatternBackgroundColor ?? dataset.fillPatternBackgroundColor
    }
  }
  if ('fill' in ruleStyle) {
    // Rule explicitly sets a plain fill — do not inherit any parent pattern
    return { fill: ruleStyle.fill }
  }
  return {
    fill: dataset.fill,
    fillPattern: dataset.fillPattern,
    fillPatternSvgContent: dataset.fillPatternSvgContent,
    fillPatternForegroundColor: dataset.fillPatternForegroundColor,
    fillPatternBackgroundColor: dataset.fillPatternBackgroundColor
  }
}

const getCombinedFilter = (datasetFilter, ruleFilter) => {
  if (datasetFilter && ruleFilter) {
    return ['all', datasetFilter, ruleFilter]
  }
  return ruleFilter || datasetFilter || null
}

const getSymbolDescription = (dataset, ruleStyle) => {
  if ('symbolDescription' in ruleStyle) {
    return ruleStyle.symbolDescription
  }
  if (hasCustomVisualStyle(ruleStyle)) {
    return undefined
  }
  return dataset.symbolDescription
}

/**
 * Merge a featureStyleRule with its parent dataset, producing a flat style
 * object suitable for layer creation and key symbol rendering.
 *
 * The rule's nested `style` object is flattened before merging.
 *
 * Fill precedence (highest to lowest):
 *   1. Rule's own fillPattern
 *   2. Rule's own fill (explicit, even if transparent — clears any parent pattern)
 *   3. Parent's fillPattern
 *   4. Parent's fill
 *
 * symbolDescription is only inherited from the parent when the rule has no
 * custom visual styles of its own. If the rule overrides stroke/fill/pattern
 * without setting symbolDescription explicitly, no description is shown.
 */
export const mergeRule = (dataset, rule) => {
  const ruleStyle = rule.style || {}
  const combinedFilter = getCombinedFilter(dataset.filter, rule.filter)

  return {
    id: rule.id,
    label: rule.label,
    stroke: ruleStyle.stroke ?? dataset.stroke,
    strokeWidth: ruleStyle.strokeWidth ?? dataset.strokeWidth,
    strokeDashArray: ruleStyle.strokeDashArray ?? dataset.strokeDashArray,
    opacity: ruleStyle.opacity ?? dataset.opacity,
    keySymbolShape: ruleStyle.keySymbolShape ?? dataset.keySymbolShape,
    symbolDescription: getSymbolDescription(dataset, ruleStyle),
    showInKey: rule.showInKey ?? dataset.showInKey,
    toggleVisibility: rule.toggleVisibility ?? false,
    filter: combinedFilter,
    minZoom: dataset.minZoom,
    maxZoom: dataset.maxZoom,
    ...getFillProps(dataset, ruleStyle)
  }
}
