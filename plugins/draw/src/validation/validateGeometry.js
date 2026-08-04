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
 * callback. Rules run first and short-circuit on the first failure; the callback
 * runs last. Gates the Done button only — never reverts a vertex change.
 *
 * @param {object} feature - current GeoJSON feature
 * @param {object} context - { phase: import('../adapterEvents.js').GeometryChangePhase, vertexIndex, mode }
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to DEFAULT_RULES; called as rule(feature, context)
 * @param {function(import('../adapterEvents.js').GeometryChangeEvent): (boolean|{valid: boolean, reason?: string}|undefined)} [config.onGeometryChange]
 *   - user callback, called as onGeometryChange({ feature, ...context }) — a single
 *   event object, unlike the internal rules above, matching the shape of the
 *   PLACEMENT_BLOCKED adapter event
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateGeometry = (feature, context = {}, config = {}) => {
  const { rules = SOFT_RULES, onGeometryChange } = config

  for (const rule of rules) {
    const result = normaliseResult(rule(feature, context))
    if (!result.valid) { return result }
  }

  if (typeof onGeometryChange === 'function') {
    return normaliseResult(onGeometryChange({ feature, ...context }))
  }

  return { valid: true }
}

/**
 * Validate a candidate vertex placement against the hard rules and the same
 * optional user callback. A failure means the vertex is rejected outright and
 * never appears. The callback receives `context.phase === 'place'`.
 *
 * @param {object} feature - candidate GeoJSON feature (placed vertices + new point)
 * @param {object} context - { vertexIndex, mode }; phase is forced to 'place'
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to HARD_RULES
 * @param {function(import('../adapterEvents.js').GeometryChangeEvent): (boolean|{valid: boolean, reason?: string}|undefined)} [config.onGeometryChange] - user callback
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validatePlacement = (feature, context = {}, config = {}) => {
  const { rules = HARD_RULES, onGeometryChange } = config
  return validateGeometry(feature, { ...context, phase: 'place' }, { rules, onGeometryChange })
}

export const MODE_BY_GEOMETRY = { Polygon: 'draw_polygon', LineString: 'draw_line' }

/**
 * Attempt to place a vertex — shared by both adapters. Builds the candidate
 * geometry, validates it, and on a veto returns the PLACEMENT_BLOCKED payload
 * for the caller to emit.
 *
 * @param {object} params
 * @param {Array<Array<number>>} params.placed - committed vertex coordinates
 * @param {Array<number>} params.point - the coordinate about to be placed
 * @param {'Polygon'|'LineString'} params.geometryType
 * @param {function(import('../adapterEvents.js').GeometryChangeEvent): (boolean|{valid: boolean, reason?: string}|undefined)} [params.onGeometryChange] - user callback
 * @returns {{ valid: true } | { valid: false, blocked: object }}
 */
export const attemptPlacement = ({ placed, point, geometryType, onGeometryChange }) => {
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
 * stroke: the placed vertices plus the current cursor point. The built-in live
 * rules (self-intersection/area) are meaningless below the geometry type's
 * minimum vertex count — there isn't a real ring/line yet — so they're skipped
 * entirely until then; a caller's own `onGeometryChange` has no such floor
 * (numVertices defaults to 0 via `context.numVertices ?? 0`, so it still runs).
 *
 * Used directly by edit mode's live-stroke check (there's no Add-point gate to
 * combine with there, so it's a self-contained call). Draw mode does NOT use
 * this — see liveDrawChecks.js, which combines this same LIVE_RULES set with a
 * separate HARD_RULES-based placement check, both driven from a single shared
 * `onGeometryChange` call rather than one call each.
 *
 * @param {object} feature - displayed GeoJSON feature (placed vertices + cursor)
 * @param {object} context - { mode, numVertices, phase }; phase defaults to 'preview'
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to LIVE_RULES
 * @param {function(import('../adapterEvents.js').GeometryChangeEvent): (boolean|{valid: boolean, reason?: string}|undefined)} [config.onGeometryChange] - user callback
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateDisplayedGeometry = (feature, context = {}, config = {}) => {
  const { rules = LIVE_RULES, onGeometryChange } = config
  const type = feature?.geometry?.type ?? feature?.type
  const min = MIN_VERTICES[type] ?? 0
  const numVertices = context.numVertices ?? 0
  const effectiveRules = numVertices < min ? [] : rules
  return validateGeometry(feature, { ...context, phase: context.phase ?? 'preview' }, { rules: effectiveRules, onGeometryChange })
}
