import { validateGeometry } from './validateGeometry.js'
import { LIVE_RULES, HARD_RULES, MIN_VERTICES } from './rules.js'
import { requestFrame, cancelFrame } from './liveStroke.js'

/**
 * Live validation driver for DRAW mode (draw_polygon/draw_line) only — edit mode
 * has no Add-point gate and keeps using the plain createLiveStroke (liveStroke.js).
 *
 * On every rubber-band move, a user `onGeometryChange` callback is called ONCE,
 * throttled to one call per animation frame (phase 'preview', with NO
 * vertex-count floor — a location-based rule is meaningful even against the
 * very first candidate point, before any vertex is committed). Its verdict is
 * combined with two INDEPENDENTLY-floored built-in rule checks, each flip-guarded
 * and reported through its own callback — `onChange(invalid, reason)` fires only
 * when THAT gate's own state flips, same contract as createLiveStroke:
 *   - LIVE_RULES (closed-ring self-intersect/area), floored at the geometry
 *     type's minimum vertex count — self-intersection/area are meaningless
 *     below that — reported via onStrokeChange (dashed stroke / Done gate).
 *   - HARD_RULES (open-path self-intersect), never floored, so it still
 *     protects placing an invalid first vertex — reported via onPlaceChange
 *     (Add-point gate).
 * Previously each gate ran its own independently-throttled call to the same
 * user callback (one forcing phase 'preview', the other forcing phase 'place'),
 * firing it twice per rubber-band move for what was really one live moment.
 * This unifies that into a single call, whose verdict both gates share.
 *
 * Being flip-guarded itself (unlike an earlier version of this module), a
 * caller only strictly needs createLiveStroke for onStrokeChange — where
 * MaplibreDrawAdapter.js/OL DrawMode.js feed it into their existing shared
 * `_liveStroke.set()` sink, since that instance is also driven independently
 * by edit mode and must stay the single source of truth for the rendered
 * stroke. onPlaceChange has no such cross-mode instance to stay in sync with —
 * draw mode is its only caller — so it can emit CAN_PLACE_CHANGE directly.
 *
 * @param {object} params
 * @param {(invalid: boolean, reason: string|null) => void} params.onStrokeChange
 * @param {(vetoed: boolean, reason: string|null) => void} params.onPlaceChange
 * @returns {{ update: Function, reset: Function, destroy: Function }}
 */
export const createLiveDrawChecks = ({ onStrokeChange, onPlaceChange }) => {
  // A small flip-guarded gate — same shape as liveStroke.js's own `flip`, one
  // per output so the stroke and placement verdicts track independently.
  const makeGate = (onChange) => {
    let invalid = false
    return (next, reason) => {
      if (next !== invalid) {
        invalid = next
        onChange(next, reason ?? null)
      }
    }
  }
  const flipStroke = makeGate(onStrokeChange)
  const flipPlace = makeGate(onPlaceChange)

  let customInvalid = false
  let customReason = null
  let frame = null
  let pending = null

  const cancelPending = () => {
    if (frame != null) { cancelFrame(frame); frame = null }
    pending = null
  }

  // One built-in rule set, its own floor, and the gate it drives — the stroke
  // and placement checks are otherwise identical shape.
  const evaluateGate = (feature, context, rules, floor, flip) => {
    const numVertices = context.numVertices ?? 0
    const result = numVertices < floor
      ? { valid: true }
      : validateGeometry(feature, { ...context, phase: 'preview' }, { rules })
    flip(!result.valid || customInvalid, result.valid ? customReason : result.reason)
  }

  const recompute = () => {
    if (!pending) { return }
    const { feature, context } = pending
    const min = MIN_VERTICES[feature?.geometry?.type] ?? 0
    evaluateGate(feature, context, LIVE_RULES, min, flipStroke)
    evaluateGate(feature, context, HARD_RULES, 0, flipPlace)
  }

  const runUserRule = () => {
    frame = null
    if (!pending) { return }
    const { feature, context, onGeometryChange } = pending
    const result = validateGeometry(feature, { ...context, phase: 'preview' }, { rules: [], onGeometryChange })
    customInvalid = !result.valid
    customReason = result.reason
    recompute()
  }

  return {
    // Re-evaluate the displayed geometry after a rubber-band move.
    update ({ feature, context = {}, numVertices, onGeometryChange }) {
      pending = { feature, context: { ...context, numVertices }, onGeometryChange }
      // Built-in rules first, synchronously — immediate feedback either gate.
      recompute()
      // A user rule (if any) decides last, throttled to one frame; its cached
      // verdict (customInvalid) feeds the next recompute() once it lands.
      if (typeof onGeometryChange === 'function' && frame == null) {
        frame = requestFrame(runUserRule)
      }
    },
    // Authoritative reset for starting a fresh draw session: clears cached
    // custom validity and drops any pending frame so a previous session's
    // verdict can't leak, and re-asserts both gates back to valid — through
    // the same flip guards, so it only fires what actually changed.
    reset () {
      cancelPending()
      customInvalid = false
      customReason = null
      flipStroke(false, null)
      flipPlace(false, null)
    },
    destroy () {
      cancelPending()
    }
  }
}
