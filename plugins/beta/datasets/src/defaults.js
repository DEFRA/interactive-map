const datasetDefaults = {
  minZoom: 6,
  maxZoom: 24,
  showInKey: false,
  toggleVisibility: false,
  visibility: 'visible',
  style: {
    stroke: '#d4351c',
    strokeWidth: 2,
    fill: 'transparent',
    symbolDescription: 'red outline'
  }
}

// All properties considered style properties — must be provided via dataset.style, not at the top level.
const STYLE_PROPS = [
  'stroke', 'strokeWidth', 'strokeDashArray',
  'fill', 'fillPattern', 'fillPatternSvgContent', 'fillPatternForegroundColor', 'fillPatternBackgroundColor',
  'opacity', 'symbolDescription', 'keySymbolShape', 'symbol'
]

// Props whose presence in a style object indicates a custom visual style.
// When any are set, the default symbolDescription is not appropriate.
const VISUAL_STYLE_PROPS = ['stroke', 'fill', 'fillPattern', 'fillPatternSvgContent', 'symbol']

const hasCustomVisualStyle = (style) =>
  VISUAL_STYLE_PROPS.some(prop => prop in style)

/**
 * Merge a dataset config with defaults, flattening the nested `style` object.
 * Style properties must be provided via dataset.style — top-level occurrences are ignored.
 * symbolDescription from defaults.style is dropped when custom visual styles
 * are present and the dataset doesn't explicitly set its own symbolDescription.
 */
const applyDatasetDefaults = (dataset, defaults) => {
  const style = dataset.style || {}
  const mergedStyle = { ...defaults.style, ...style }
  if (!('symbolDescription' in style) && hasCustomVisualStyle(style)) {
    delete mergedStyle.symbolDescription
  }
  const topLevel = { ...dataset }
  delete topLevel.style
  STYLE_PROPS.forEach(prop => delete topLevel[prop])
  const topLevelDefaults = { ...defaults }
  delete topLevelDefaults.style
  return { ...topLevelDefaults, ...topLevel, ...mergedStyle }
}

export { datasetDefaults, hasCustomVisualStyle, applyDatasetDefaults }
