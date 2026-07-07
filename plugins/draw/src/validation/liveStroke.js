import { validateDisplayedGeometry } from './validateGeometry.js'

const requestFrame = (cb) =>
  (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 16))
const cancelFrame = (id) =>
  (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id))

/**
 * Engine-agnostic driver for a live validity signal while drawing/editing —
 * the invalid stroke by default, or (via `validate`) any other continuously
 * re-evaluated verdict such as the Add-point placement gate.
 *
 * On every rubber-band/drag move the caller passes the displayed geometry (placed
 * vertices + cursor). The default rules run synchronously for immediate feedback;
 * a user `onGeometryChange` callback — whose cost is unknown — is throttled to one
 * call per animation frame using the latest geometry (trailing edge), so an
 * arbitrary user rule can't jank the drag. The default-fail path short-circuits
 * (no user call) and cancels any pending frame so a stale evaluation can't flip
 * the state back. `onChange(invalid, reason)` fires only when the state flips.
 *
 * @param {object} params
 * @param {(invalid: boolean, reason: string|null) => void} params.onChange
 * @param {Function} [params.validate] - (feature, context, config) => { valid, reason };
 *   defaults to validateDisplayedGeometry (the invalid-stroke rules)
 * @returns {{ update: Function, set: Function, reset: Function, destroy: Function }}
 */
export const createLiveStroke = ({ onChange, validate = validateDisplayedGeometry }) => {
  let invalid = false
  let frame = null
  let pending = null

  const cancelPending = () => {
    if (frame != null) { cancelFrame(frame); frame = null }
    pending = null
  }

  const flip = (next, reason) => {
    if (next !== invalid) {
      invalid = next
      onChange(next, reason ?? null)
    }
  }

  const runUserRule = () => {
    frame = null
    if (!pending) { return }
    const { feature, context, onGeometryChange } = pending
    const { valid, reason } = validate(feature, context, { onGeometryChange })
    flip(!valid, reason)
  }

  return {
    // Re-evaluate the displayed geometry after a rubber-band move.
    update ({ feature, context = {}, placedCount, onGeometryChange }) {
      const ctx = { ...context, placedCount }
      // Default rules first, synchronously — immediate feedback on self-intersection / area.
      const base = validate(feature, ctx)
      if (!base.valid) { cancelPending(); flip(true, base.reason); return }
      // Default rules pass — a user rule (if any) decides, throttled to one frame.
      if (typeof onGeometryChange !== 'function') { cancelPending(); flip(false, null); return }
      pending = { feature, context: ctx, onGeometryChange }
      if (frame == null) { frame = requestFrame(runUserRule) }
    },
    // Authoritative external write — a committed verdict (events.js) or a mode
    // reset. Applies through the same flip guard so the cached state always
    // mirrors what is rendered, and drops any pending user-rule frame so a stale
    // live evaluation can't overwrite it a frame later.
    set (next, reason) {
      cancelPending()
      flip(next, reason ?? null)
    },
    // Re-assert the cached state through onChange unconditionally — for callers
    // whose rendered output was reset behind the controller's back (e.g. a map
    // style reload re-adding layers with their spec-default visibility).
    refresh () {
      onChange(invalid, null)
    },
    destroy () {
      cancelPending()
    }
  }
}
