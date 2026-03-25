/**
 * Merge a featureStyleRule with its parent dataset, producing a flat style
 * object suitable for layer creation and key symbol rendering.
 *
 * Fill precedence (highest to lowest):
 *   1. Rule's own fillPattern
 *   2. Rule's own fill (explicit, even if transparent — clears any parent pattern)
 *   3. Parent's fillPattern
 *   4. Parent's fill
 *
 * All other style props fall back to the parent dataset if not set on the rule.
 */
export const mergeRule = (dataset, rule) => {
  const ruleHasPattern = !!(rule.fillPattern || rule.fillPatternSvgContent)
  const ruleHasExplicitFill = 'fill' in rule

  let fillProps
  if (ruleHasPattern) {
    fillProps = {
      fillPattern: rule.fillPattern,
      fillPatternSvgContent: rule.fillPatternSvgContent,
      fillPatternForegroundColor: rule.fillPatternForegroundColor ?? dataset.fillPatternForegroundColor,
      fillPatternBackgroundColor: rule.fillPatternBackgroundColor ?? dataset.fillPatternBackgroundColor
    }
  } else if (ruleHasExplicitFill) {
    // Rule explicitly sets a plain fill — do not inherit any parent pattern
    fillProps = { fill: rule.fill }
  } else {
    fillProps = {
      fill: dataset.fill,
      fillPattern: dataset.fillPattern,
      fillPatternSvgContent: dataset.fillPatternSvgContent,
      fillPatternForegroundColor: dataset.fillPatternForegroundColor,
      fillPatternBackgroundColor: dataset.fillPatternBackgroundColor
    }
  }

  const combinedFilter = dataset.filter && rule.filter
    ? ['all', dataset.filter, rule.filter]
    : (rule.filter || dataset.filter || null)

  return {
    id: rule.id,
    label: rule.label,
    stroke: rule.stroke ?? dataset.stroke,
    strokeWidth: rule.strokeWidth ?? dataset.strokeWidth,
    strokeDashArray: rule.strokeDashArray ?? dataset.strokeDashArray,
    opacity: rule.opacity ?? dataset.opacity,
    keySymbolShape: rule.keySymbolShape ?? dataset.keySymbolShape,
    symbolDescription: rule.symbolDescription ?? dataset.symbolDescription,
    showInKey: rule.showInKey ?? dataset.showInKey,
    toggleVisibility: rule.toggleVisibility ?? false,
    filter: combinedFilter,
    minZoom: dataset.minZoom,
    maxZoom: dataset.maxZoom,
    ...fillProps
  }
}
