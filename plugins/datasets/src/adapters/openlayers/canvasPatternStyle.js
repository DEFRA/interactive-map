import Style from 'ol/style/Style.js'
import Stroke from 'ol/style/Stroke.js'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'

/**
 * The Canvas-only style for genuinely crisp fill patterns, at any pixelRatio.
 *
 * ol/style/flat's declarative fill-pattern-src crops a pattern to its display size rather than
 * scaling it, so it can't hold more source detail than it shows on screen. The OL provider instead
 * caches each pattern as an ol/style/Fill whose colour is a CanvasPattern built from the
 * pixelRatio-scaled image (see its addPatternsToMap/getPatternFill), and this builds a style
 * function around that fill.
 *
 * Building actual ol/style/Style objects only works on Canvas — WebGLVector requires flat-style
 * JSON (compiled to GLSL ahead of time), so this module is Canvas-only. See layerBuilders.js's
 * resolveLayerStyle for where this is picked over the shared flatStyle path.
 */

const buildStroke = (registryDataset, mapStyleId) => {
  if (!registryDataset.hasStroke) {
    return undefined
  }
  return new Stroke({
    color: getValueForStyle(registryDataset.style.stroke, mapStyleId),
    width: registryDataset.style.strokeWidth,
    lineDash: registryDataset.style.strokeDashArray
  })
}

/**
 * Builds an OL style function for a Canvas-rendered, pattern-bearing dataset/sublayer — uses a
 * real CanvasPattern (see module doc), bypassing OpenLayersDataset.getFlatStyle for this one case.
 * @param {Object} registryDataset - an OpenLayersDataset with hasPattern true
 * @param {Object} context - the adapter's style context
 * @param {string} context.mapStyleId
 * @param {number} context.pixelRatio - the ratio the adapter last registered patterns at
 * @param {Object} context.patternRegistry
 * @param {Function} context.getPatternFill - the OL provider's registered pattern fill lookup
 * @param {Function} context.buildFilterEvaluator - the OL provider's filter compiler
 * @returns {import('ol/style/Style.js').StyleFunction}
 */
export const buildCanvasPatternStyle = (registryDataset, { mapStyleId, pixelRatio, patternRegistry, getPatternFill, buildFilterEvaluator }) => {
  const imageId = patternRegistry.getPatternImageId(registryDataset.style, mapStyleId, pixelRatio)
  const fill = imageId && getPatternFill(imageId)
  const style = fill ? new Style({ fill, stroke: buildStroke(registryDataset, mapStyleId) }) : undefined
  const matchesFilter = buildFilterEvaluator(registryDataset.filter)

  return (feature) => {
    if (!style) {
      return undefined
    }
    if (matchesFilter && !matchesFilter(feature)) {
      return undefined
    }
    return style
  }
}
