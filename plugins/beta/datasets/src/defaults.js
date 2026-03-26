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

// Props whose presence in a style object indicates a custom visual style.
// When any are set, the default symbolDescription is not appropriate.
const VISUAL_STYLE_PROPS = ['stroke', 'fill', 'fillPattern', 'fillPatternSvgContent']

const hasCustomVisualStyle = (style) =>
  VISUAL_STYLE_PROPS.some(prop => prop in style)

/**
 * Merge a dataset config with defaults, flattening the nested `style` object.
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
  const topLevelDefaults = { ...defaults }
  delete topLevelDefaults.style
  return { ...topLevelDefaults, ...topLevel, ...mergedStyle }
}

export { datasetDefaults, hasCustomVisualStyle, applyDatasetDefaults }
