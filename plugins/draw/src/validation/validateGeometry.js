import { COMMIT_RULES, PLACE_RULES, PREVIEW_RULES, MIN_VERTICES } from './rules.js'

/**
 * Normalise a rule / callback result into `{ valid, reason, announcement?, recheckOnFinish? }`.
 *
 * Supports three return shapes so a user `onGeometryPreview`/`onGeometryChange` callback can stay
 * terse:
 *   - `true`  / `undefined`  → valid
 *   - `false`                → invalid (no reason)
 *   - `{ valid, reason, announcement, recheckOnFinish, properties }` → passed through
 */
export const normaliseResult = (result) => {
  if (result === undefined || result === true) { return { valid: true } }
  if (result === false) { return { valid: false, reason: null } }
  const { valid, reason, announcement, recheckOnFinish, properties } = result
  const isValid = valid !== false
  return {
    valid: isValid,
    reason,
    ...(announcement && { announcement }),
    ...(recheckOnFinish && { recheckOnFinish: true }),
    // Only a passing result can add properties: an invalid shape isn't finished. Their shape
    // is checked when they're merged (see mergeFeatureProperties), which warns if it's wrong.
    ...(isValid && properties != null && { properties })
  }
}

// Marks a failure with who gave it: a built-in rule ('rules') or the consumer ('callback')
export const withSource = (result, source) => (result.valid ? result : { ...result, source })

/**
 * Validate an in-progress geometry against the default rules and an optional user
 * callback. Rules run first and short-circuit on the first failure; the callback
 * runs last. Gates the Done button only — never reverts a vertex change.
 *
 * @param {object} feature - current GeoJSON feature
 * @param {object} context - { phase: import('../adapterEvents.js').GeometryChangePhase, vertexIndex, mode }
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to DEFAULT_RULES; called as rule(feature, context)
 * @param {function(import('../adapterEvents.js').GeometryChangeEvent): (boolean|{valid: boolean, reason?: string}|undefined)} [config.onGeometryPreview]
 *   - user callback, called as onGeometryPreview({ feature, ...context }) — a single
 *   event object, unlike the internal rules above, matching the shape of the
 *   PLACEMENT_BLOCKED adapter event
 * @returns {{ valid: boolean, reason?: string, source?: 'rules'|'callback', announcement?: string }}
 */
export const validateGeometry = (feature, context = {}, config = {}) => {
  const { rules = COMMIT_RULES, onGeometryPreview } = config

  for (const rule of rules) {
    const result = normaliseResult(rule(feature, context))
    if (!result.valid) { return withSource(result, 'rules') }
  }

  if (typeof onGeometryPreview === 'function') {
    return withSource(normaliseResult(onGeometryPreview({ feature, ...context })), 'callback')
  }

  return { valid: true }
}

/**
 * Validate a candidate vertex placement against the placement rules and the same
 * optional user callback. A failure means the vertex is rejected outright and
 * never appears. The callback receives `context.phase === 'place'`.
 *
 * @param {object} feature - candidate GeoJSON feature (placed vertices + new point)
 * @param {object} context - { vertexIndex, mode }; phase is forced to 'place'
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to PLACE_RULES
 * @param {function(import('../adapterEvents.js').GeometryChangeEvent): (boolean|{valid: boolean, reason?: string}|undefined)} [config.onGeometryPreview] - user callback
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validatePlacement = (feature, context = {}, config = {}) => {
  const { rules = PLACE_RULES, onGeometryPreview } = config
  return validateGeometry(feature, { ...context, phase: 'place' }, { rules, onGeometryPreview })
}

export const MODE_BY_GEOMETRY = { Polygon: 'draw_polygon', LineString: 'draw_line' }

/**
 * The PLACEMENT_BLOCKED payload for a vetoed placement.
 *
 * @param {object} feature - candidate GeoJSON feature
 * @param {{ reason?: string, source?: string, announcement?: string }} result - the failed validatePlacement result
 * @param {{ mode: string, vertexIndex: number }} context
 */
export const toPlacementBlocked = (feature, { reason, source, announcement }, { mode, vertexIndex }) => ({
  feature,
  reason: reason ?? null,
  source,
  ...(announcement && { announcement }),
  phase: 'place',
  mode,
  vertexIndex
})

/**
 * Attempt to place a vertex — shared by both adapters. Builds the candidate
 * geometry, validates it, and on a veto returns the PLACEMENT_BLOCKED payload
 * for the caller to emit.
 *
 * @param {object} params
 * @param {Array<Array<number>>} params.placed - committed vertex coordinates
 * @param {Array<number>} params.point - the coordinate about to be placed
 * @param {'Polygon'|'LineString'} params.geometryType
 * @param {function(import('../adapterEvents.js').GeometryChangeEvent): (boolean|{valid: boolean, reason?: string}|undefined)} [params.onGeometryPreview] - user callback
 * @returns {{ valid: true } | { valid: false, blocked: object }}
 */
export const attemptPlacement = ({ placed, point, geometryType, onGeometryPreview }) => {
  const candidate = [...placed, point]
  const geometry = geometryType === 'Polygon'
    ? { type: 'Polygon', coordinates: [candidate] }
    : { type: 'LineString', coordinates: candidate }
  const feature = { type: 'Feature', geometry, properties: {} }
  const mode = MODE_BY_GEOMETRY[geometryType]
  const vertexIndex = placed.length
  const result = validatePlacement(feature, { mode, vertexIndex }, { onGeometryPreview })
  if (result.valid) { return { valid: true } }
  return { valid: false, blocked: toPlacementBlocked(feature, result, { mode, vertexIndex }) }
}

/**
 * Validate the displayed (in-progress) geometry that drives the live invalid
 * stroke: the placed vertices plus the current cursor point. The built-in live
 * rules (self-intersection/area) are meaningless below the geometry type's
 * minimum vertex count — there isn't a real ring/line yet — so they're skipped
 * entirely until then; a caller's own `onGeometryPreview` has no such floor
 * (numVertices defaults to 0 via `context.numVertices ?? 0`, so it still runs).
 *
 * Used directly by edit mode's live-stroke check (there's no Add-point gate to
 * combine with there, so it's a self-contained call). Draw mode does NOT use
 * this — see liveDrawChecks.js, which combines this same PREVIEW_RULES set with a
 * separate PLACE_RULES-based placement check, both driven from a single shared
 * `onGeometryPreview` call rather than one call each.
 *
 * @param {object} feature - displayed GeoJSON feature (placed vertices + cursor)
 * @param {object} context - { mode, numVertices, phase }; phase defaults to 'preview'
 * @param {object} [config]
 * @param {Array<Function>} [config.rules] - defaults to PREVIEW_RULES
 * @param {function(import('../adapterEvents.js').GeometryChangeEvent): (boolean|{valid: boolean, reason?: string}|undefined)} [config.onGeometryPreview] - user callback
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateDisplayedGeometry = (feature, context = {}, config = {}) => {
  const { rules = PREVIEW_RULES, onGeometryPreview } = config
  const type = feature?.geometry?.type ?? feature?.type
  const min = MIN_VERTICES[type] ?? 0
  const numVertices = context.numVertices ?? 0
  const effectiveRules = numVertices < min ? [] : rules
  return validateGeometry(feature, { ...context, phase: context.phase ?? 'preview' }, { rules: effectiveRules, onGeometryPreview })
}
