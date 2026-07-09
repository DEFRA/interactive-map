import { SOFT_RULES, HARD_RULES, LIVE_RULES, MIN_VERTICES } from './rules.js'

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
 * @param {object} context - { phase: import('../adapterEvents.js').GeometryChangePhase, vertexIndex, mode }
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
 * The user callback receives `context.phase === 'place'` to distinguish a
 * placement veto from a soft validity check.
 *
 * @param {object} feature - candidate GeoJSON feature (placed vertices + new point)
 * @param {object} context - { vertexIndex, mode }; phase is forced to 'place'
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to HARD_RULES
 * @param {Function} [config.onGeometryChange] - user callback, same signature as a rule
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validatePlacement = (feature, context = {}, config = {}) => {
  const { rules = HARD_RULES, onGeometryChange } = config
  return validateGeometry(feature, { ...context, phase: 'place' }, { rules, onGeometryChange })
}

export const MODE_BY_GEOMETRY = { Polygon: 'draw_polygon', LineString: 'draw_line' }

/**
 * Engine-facing placement gate shared by both adapters: builds the candidate
 * geometry (placed vertices + the point about to be placed), validates it against
 * the hard rules and the user callback, and — on a veto — returns the
 * PLACEMENT_BLOCKED payload for the caller to emit on its bus.
 *
 * @param {object} params
 * @param {Array<Array<number>>} params.placed - committed vertex coordinates
 * @param {Array<number>} params.point - the coordinate about to be placed
 * @param {'Polygon'|'LineString'} params.geometryType
 * @param {Function} [params.onGeometryChange] - user callback
 * @returns {{ valid: true } | { valid: false, blocked: object }}
 */
export const checkPlacement = ({ placed, point, geometryType, onGeometryChange }) => {
  const candidate = [...placed, point]
  const geometry = geometryType === 'Polygon'
    ? { type: 'Polygon', coordinates: [candidate] }
    : { type: 'LineString', coordinates: candidate }
  const feature = { type: 'Feature', geometry, properties: {} }
  const mode = MODE_BY_GEOMETRY[geometryType]
  const { valid, reason } = validatePlacement(feature, { mode, vertexIndex: placed.length }, { onGeometryChange })
  if (valid) { return { valid: true } }
  return { valid: false, blocked: { feature, reason: reason ?? null, phase: 'place', mode, vertexIndex: placed.length } }
}

/**
 * Validate the displayed (in-progress) geometry that drives the live invalid
 * stroke: the placed vertices plus the current cursor / crosshair point. It gates
 * on `context.placedCount` so a shape below its minimum vertex count is treated as
 * "part-drawn" (always valid — solid stroke); once past the threshold it runs the
 * live rules (self-intersection, non-zero area) and the optional user callback
 * against the displayed geometry, returning `{ valid, reason }`.
 *
 * @param {object} feature - displayed GeoJSON feature (placed vertices + cursor)
 * @param {object} context - { mode, placedCount, phase }; phase defaults to 'preview'
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to LIVE_RULES
 * @param {Function} [config.onGeometryChange] - user callback, same signature as a rule
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateDisplayedGeometry = (feature, context = {}, config = {}) => {
  const { rules = LIVE_RULES, onGeometryChange } = config
  const type = feature?.geometry?.type ?? feature?.type
  const min = MIN_VERTICES[type] ?? 0
  if ((context.placedCount ?? 0) < min) { return { valid: true } }
  return validateGeometry(feature, { ...context, phase: context.phase ?? 'preview' }, { rules, onGeometryChange })
}
