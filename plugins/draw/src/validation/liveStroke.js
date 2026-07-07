import { validateDisplayedGeometry } from './validateGeometry.js'

const requestFrame = (cb) =>
  (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 16))
const cancelFrame = (id) =>
  (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id))

/**
 * Engine-agnostic driver for the live invalid stroke while drawing.
 *
 * On every rubber-band move the caller passes the displayed geometry (placed
 * vertices + cursor). The default rules (self-intersection, non-zero area) run
 * synchronously for immediate feedback; a user `onGeometryChange` callback — whose
 * cost is unknown — is throttled to one call per animation frame using the latest
 * geometry (trailing edge), so an arbitrary user rule can't jank the drag. The
 * default-fail path short-circuits (no user call) and cancels any pending frame so
 * a stale evaluation can't flip the stroke back. `onChange(invalid, reason)` fires
 * only when the invalid state actually flips.
 *
 * @param {object} params
 * @param {(invalid: boolean, reason: string|null) => void} params.onChange
 * @returns {{ update: Function, reset: Function, destroy: Function }}
 */
export const createLiveStroke = ({ onChange }) => {
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
      // eslint-disable-next-line no-console -- TEMP live-stroke diagnostics
      console.log('[live-stroke] FLIP →', next)
      onChange(next, reason ?? null)
    }
  }

  const runUserRule = () => {
    frame = null
    if (!pending) { return }
    const { feature, context, onGeometryChange } = pending
    const { valid, reason } = validateDisplayedGeometry(feature, context, { onGeometryChange })
    flip(!valid, reason)
  }

  return {
    // Re-evaluate the displayed geometry after a rubber-band move.
    update ({ feature, context = {}, placedCount, onGeometryChange }) {
      const ctx = { ...context, placedCount }
      // Default rules first, synchronously — immediate feedback on self-intersection / area.
      const base = validateDisplayedGeometry(feature, ctx)
      // eslint-disable-next-line no-console -- TEMP live-stroke diagnostics
      console.log('[live-stroke] update', { type: feature?.geometry?.type, placedCount, baseValid: base.valid, currentInvalid: invalid })
      if (!base.valid) { cancelPending(); flip(true, base.reason); return }
      // Default rules pass — a user rule (if any) decides, throttled to one frame.
      if (typeof onGeometryChange !== 'function') { cancelPending(); flip(false, null); return }
      pending = { feature, context: ctx, onGeometryChange }
      if (frame == null) { frame = requestFrame(runUserRule) }
    },
    // Clear state without firing onChange (the caller forces the stroke solid on a
    // fresh draw); drops any pending user-rule frame.
    reset () {
      cancelPending()
      invalid = false
    },
    destroy () {
      cancelPending()
    }
  }
}
