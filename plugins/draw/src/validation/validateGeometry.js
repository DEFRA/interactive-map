import { SOFT_RULES, HARD_RULES, LIVE_RULES } from './rules.js'

/**
 * Normalise a rule / callback result into `{ valid, reason }`.
 *
 * Supports three return shapes so a user `onGeometryChange` callback can stay
 * terse:
 *   - `true`  / `undefined`  → valid
 *   - `false`                → invalid (no reason)
 *   - `{ valid, reason }`    → passed through
 */
const normaliseResult = (result) => {
  if (result === undefined || result === true) { return { valid: true } }
  if (result === false) { return { valid: false, reason: null } }
  return { valid: result.valid !== false, reason: result.reason }
}

/**
 * Validate an in-progress geometry against the default rules and an optional user
 * callback. The result only gates the Done button (see events.js); it never reverts
 * a vertex change, so a shape can pass through interim invalid states while being
 * built. Rules run first (in order) and short-circuit on the first failure; the
 * user callback runs last.
 *
 * @param {object} feature - current GeoJSON feature
 * @param {object} context - { kind: 'add'|'move'|'insert'|'delete', vertexIndex, mode }
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to DEFAULT_RULES
 * @param {Function} [config.onGeometryChange] - user callback, same signature as a rule
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateGeometry = (feature, context = {}, config = {}) => {
  const { rules = SOFT_RULES, onGeometryChange } = config

  for (const rule of rules) {
    const result = normaliseResult(rule(feature, context))
    if (!result.valid) { return result }
  }

  if (typeof onGeometryChange === 'function') {
    return normaliseResult(onGeometryChange(feature, context))
  }

  return { valid: true }
}

/**
 * Validate a candidate vertex placement against the hard rules and the same
 * optional user callback. `feature` is the candidate geometry — the placed
 * vertices plus the point about to be placed. A failure means the adapter must
 * reject the placement (the vertex never appears), used for states that could
 * not be recovered from by continuing to draw.
 *
 * The user callback receives `context.kind === 'place'` to distinguish a
 * placement veto from a soft validity check.
 *
 * @param {object} feature - candidate GeoJSON feature (placed vertices + new point)
 * @param {object} context - { vertexIndex, mode }; kind is forced to 'place'
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to HARD_RULES
 * @param {Function} [config.onGeometryChange] - user callback, same signature as a rule
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validatePlacement = (feature, context = {}, config = {}) => {
  const { rules = HARD_RULES, onGeometryChange } = config
  return validateGeometry(feature, { ...context, kind: 'place' }, { rules, onGeometryChange })
}

const MIN_VERTICES_BY_TYPE = { Polygon: 3, LineString: 2 }

/**
 * Validate the displayed (in-progress) geometry that drives the live invalid
 * stroke: the placed vertices plus the current cursor / crosshair point. It gates
 * on `context.placedCount` so a shape below its minimum vertex count is treated as
 * "part-drawn" (always valid — solid stroke); once past the threshold it runs the
 * live rules (self-intersection, non-zero area) and the optional user callback
 * against the displayed geometry, returning `{ valid, reason }`.
 *
 * @param {object} feature - displayed GeoJSON feature (placed vertices + cursor)
 * @param {object} context - { mode, placedCount, kind }; kind defaults to 'preview'
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to LIVE_RULES
 * @param {Function} [config.onGeometryChange] - user callback, same signature as a rule
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateDisplayedGeometry = (feature, context = {}, config = {}) => {
  const { rules = LIVE_RULES, onGeometryChange } = config
  const type = feature?.geometry?.type ?? feature?.type
  const min = MIN_VERTICES_BY_TYPE[type] ?? 0
  if ((context.placedCount ?? 0) < min) { return { valid: true } }
  return validateGeometry(feature, { ...context, kind: context.kind ?? 'preview' }, { rules, onGeometryChange })
}
