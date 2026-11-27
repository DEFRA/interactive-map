import { buildExpression, newEvaluationContext } from 'ol/expr/cpu.js'
import { BooleanType, newParsingContext } from 'ol/expr/expression.js'

/**
 * Compiles a Mapbox-style filter expression (get/in/literal/to-string/all/! — the same shape
 * Dataset.filter produces, see plugins/datasets/src/registry/dataset.js) into a reusable
 * per-feature predicate. Shared by two consumers with very different call frequencies:
 * canvasPatternStyle.js's style function (evaluated once per feature on every render pass, for
 * every pattern-filtered sublayer sharing a source) and queryFeatures.js's getVisibleFeatures
 * (evaluated on demand, only when reading straight off a shared vector-tile/vector source).
 *
 * The evaluation context is built once here and mutated on every call rather than allocated
 * fresh per feature — confirmed against ol/expr/cpu.js's own compiled evaluators, which only
 * ever read context.properties/featureId/geometryType/resolution/variables synchronously within
 * the call and never retain a reference, so reuse is safe. None of the expressions this
 * evaluates touch resolution/variables, so nothing else needs resetting between features.
 * @param {Array|undefined} filter
 * @returns {(function(import('ol/Feature.js').default): boolean)|null}
 */
export const buildFilterEvaluator = (filter) => {
  if (!filter) {
    return null
  }
  const evaluator = buildExpression(filter, BooleanType, newParsingContext())
  const context = newEvaluationContext()
  return (feature) => {
    context.properties = feature.getProperties()
    context.featureId = feature.getId() ?? null
    context.geometryType = feature.getGeometry()?.getType() ?? ''
    return Boolean(evaluator(context))
  }
}
