import { SYMBOL_STYLE_KEYS } from '../../../../src/config/symbolConfig.js'

const datasetDefaults = {
  minZoom: 6,
  maxZoom: 24,
  showInKey: false,
  showInMenu: false,
  visible: true,
  style: {
    stroke: '#d4351c',
    strokeWidth: 2,
    symbolDescription: 'red outline'
  }
}

// All properties considered style properties — must be provided via dataset.style, not at the top level.
const STYLE_PROPS = [
  'stroke', 'strokeWidth', 'strokeDashArray',
  'fill', 'fillPattern', 'fillPatternSvgContent', 'fillPatternForegroundColor', 'fillPatternBackgroundColor',
  'opacity', 'symbolDescription',
  ...SYMBOL_STYLE_KEYS
]

// Props that set what a style draws. Their presence, even with an empty value such as
// `stroke: null` or `fill: 'transparent'`, indicates a custom visual style.
const VISUAL_STYLE_PROPS = ['stroke', 'fill', 'fillPattern', 'fillPatternSvgContent', 'symbol', 'symbolSvgContent']

const hasCustomVisualStyle = (style) =>
  VISUAL_STYLE_PROPS.some(prop => prop in style)

/**
 * Apply the default style to a style. The default stroke and symbolDescription apply only when
 * the style has no custom visual style; the default strokeWidth always applies.
 */
const applyStyleDefaults = (style = {}) => {
  if (!hasCustomVisualStyle(style)) {
    return { ...datasetDefaults.style, ...style }
  }
  return { strokeWidth: datasetDefaults.style.strokeWidth, ...style }
}

// The dataset's own style is kept as given. Style defaults are applied by Dataset.style, after a
// sublayer's style is merged with its parent's, so a sublayer can inherit any style prop.
const applyDatasetDefaultsWithoutFlattening = (dataset) => {
  // Allow for existing configs that use visibility instead of visible, but default to visible if neither is set
  if (dataset.visible !== true && dataset.visible !== false) {
    dataset.visible = dataset.visibility !== 'hidden'
  }
  const datasetWithDefaults = { ...datasetDefaults, ...dataset, style: { ...dataset.style } }
  STYLE_PROPS.forEach(prop => delete datasetWithDefaults[prop])
  return datasetWithDefaults
}

export { datasetDefaults, hasCustomVisualStyle, applyStyleDefaults, applyDatasetDefaultsWithoutFlattening }
