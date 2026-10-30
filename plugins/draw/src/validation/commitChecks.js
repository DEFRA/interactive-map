import { validateGeometry, normaliseResult, withSource } from './validateGeometry.js'
import { COMMIT_RULES } from './rules.js'
import { logger } from '../../../../src/services/logger.js'
import { stripInternalProperties } from '../utils/stripInternalProperties.js'

const IDLE = { revision: 0, status: 'idle', result: null, feature: null, context: null, slow: false, afterPending: false, lastResultStatus: null }

// How long an async check runs before it counts as slow: Done reads "Checking…" and the
// check is announced. A quicker reply settles without either.
export const SLOW_CHECK_MS = 300

const isThenable = (value) => typeof value?.then === 'function'

const statusFor = (result) => (result.valid ? 'valid' : 'invalid')

const BLOCKING_STATUSES = new Set(['invalid', 'error'])

// Whether the shape can be finished (the Done button and the map's finish gestures). While a
// check is pending, Done keeps the state from the last callback result, so a shape that
// failed can't be finished in the gap before the next result. With no earlier result, it can
// — except an existing feature opened by editFeature, which may already be invalid, so it
// waits for its 'edit-start' check rather than showing Done enabled and then disabled.
export const canFinishCheck = ({ status, lastResultStatus, context }) =>
  status === 'valid' ||
  (status === 'pending' && context?.phase !== 'edit-start' && !BLOCKING_STATUSES.has(lastResultStatus))

/**
 * Runs the commit-level check for each committed change: the built-in COMMIT_RULES first,
 * synchronously, then the consumer's callback, which may return a Promise: `onGeometryChange`,
 * or `onGeometryFinish` when a shape is finished.
 *
 * Every run gets a new revision and aborts the previous run's signal. A result only
 * settles if its revision is still the latest, so a slow reply for an older shape can
 * never overwrite the verdict for the current one. `onSettle(state)` fires for each
 * settled state, including 'pending' as soon as an async check starts, and 'pending' again
 * with `slow: true` once it has run for SLOW_CHECK_MS. A result that follows a slow
 * 'pending' state for the same revision has `afterPending: true`.
 *
 * Every state carries `lastResultStatus`: the status of the last result from the consumer's
 * callback (onGeometryChange, or onGeometryFinish, which runs through here too), whatever its
 * revision. The built-in rules' results don't count, so a shape that has just reached its
 * minimum vertices isn't held back by them. A superseded check never settles, so never counts.
 *
 * A finished shape waiting on the latest check can be held (`hold`), and is released when
 * that check settles or the session ends — `reset` returns its id, so it can be discarded.
 *
 * Lives per draw adapter (see getCommitChecks) rather than in events.js's handlers,
 * which are rebuilt on every plugin state change.
 *
 * States: 'idle' | 'pending' | 'valid' | 'invalid' | 'error'
 *
 * @returns {{ run: Function, reset: Function, setOnSettle: Function, hold: Function, release: Function, readonly heldId: string|undefined, readonly state: object }}
 */
export const createCommitChecks = () => {
  let revision = 0
  let slowRevision = null
  let slowTimer = null
  let abortController = null
  let latest = IDLE
  let onSettle = null
  let held = null

  const abortPending = () => {
    abortController?.abort()
    abortController = null
    clearTimeout(slowTimer)
  }

  const settle = (rev, next, { fromCallback = false } = {}) => {
    if (rev !== revision) { return }
    const lastResultStatus = fromCallback ? next.status : latest.lastResultStatus
    if (next.status !== 'pending') {
      abortController = null
      clearTimeout(slowTimer)
    }
    const slow = !!next.slow
    const afterPending = next.status !== 'pending' && slowRevision === rev
    slowRevision = slow ? rev : null
    latest = { ...next, revision: rev, slow, afterPending, lastResultStatus }
    onSettle?.(latest)
  }

  return {
    get state () { return latest },

    setOnSettle (fn) { onSettle = fn },

    // The finished shape held for the latest check, if any
    get heldId () { return held?.revision === revision ? held.id : undefined },

    hold (featureId) { held = { id: featureId, revision } },

    release () { held = null },

    /**
     * @param {object} params
     * @param {object} params.feature - the committed GeoJSON feature
     * @param {object} params.context - { phase, mode, vertexIndex }
     * @param {Function} [params.consumerCheck] - the consumer's onGeometryChange or onGeometryFinish
     * @param {Array<Function>} [params.rules] - built-in rules, defaults to COMMIT_RULES
     */
    run ({ feature, context, consumerCheck, rules = COMMIT_RULES }) {
      abortPending()
      revision++
      const rev = revision
      const base = { feature, context }

      const builtIn = validateGeometry(feature, context, { rules })
      if (!builtIn.valid || typeof consumerCheck !== 'function') {
        settle(rev, { ...base, status: statusFor(builtIn), result: builtIn })
        return
      }

      abortController = new AbortController()
      const onError = (error) => {
        // A superseded check rejecting (e.g. on its aborted signal) isn't a failure
        if (rev !== revision) { return }
        logger.warn(`[draw] geometry check failed (${context?.phase})`, error)
        settle(rev, { ...base, status: 'error', result: { valid: false, reason: null, source: 'callback' }, error }, { fromCallback: true })
      }

      let output
      try {
        output = consumerCheck({ feature, ...context }, { signal: abortController.signal, revision: rev })
      } catch (error) {
        onError(error)
        return
      }

      const settleResult = (value) => {
        const result = withSource(normaliseResult(value), 'callback')
        settle(rev, { ...base, status: statusFor(result), result }, { fromCallback: true })
      }

      if (!isThenable(output)) { settleResult(output); return }

      settle(rev, { ...base, status: 'pending', result: null })
      slowTimer = setTimeout(() => settle(rev, { ...base, status: 'pending', result: null, slow: true }), SLOW_CHECK_MS)
      output.then(settleResult, onError)
    },

    // Ends the session: aborts any check in flight and drops whatever it returns. Returns
    // the id of a shape that was held for it, which nothing will now create.
    reset () {
      const heldId = held?.revision === revision ? held.id : undefined
      abortPending()
      revision++
      latest = IDLE
      held = null
      return heldId
    }
  }
}

const checksByDraw = new WeakMap()

// One controller per draw adapter, so each map on a page keeps its own revisions.
export const getCommitChecks = (draw) => {
  let checks = checksByDraw.get(draw)
  if (!checks) {
    checks = createCommitChecks()
    checksByDraw.set(draw, checks)
  }
  return checks
}

// Ring closure differs between a placed-vertices commit (open ring) and the finished
// feature (closed ring), so the closing coordinate is ignored when comparing.
const openRing = (ring) => {
  const first = ring[0]
  const last = ring[ring.length - 1]
  return ring.length > 1 && first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring
}

const comparableCoords = (geometry) =>
  geometry.type === 'Polygon' ? geometry.coordinates.map(openRing) : geometry.coordinates

export const isSameGeometry = (a, b) => {
  const geomA = a?.geometry
  const geomB = b?.geometry
  if (!geomA || !geomB || geomA.type !== geomB.type) { return false }
  return JSON.stringify(comparableCoords(geomA)) === JSON.stringify(comparableCoords(geomB))
}

/**
 * Starts a draw/edit session's checks: installs the session's callbacks on the
 * adapter and ends any previous session's check. A per-call callback replaces the
 * plugin-level one. A shape still waiting on that check is discarded, as Cancel would.
 *
 *   - `draw._previewValidator` — onGeometryPreview, read by the adapters for the
 *     'preview' and 'place' phases
 *   - `draw._commitValidator`  — onGeometryChange, read by events.js for committed changes
 *   - `draw._finishValidator`  — onGeometryFinish, read by events.js when a shape is finished
 */
export const startCheckSession = (draw, options = {}, pluginConfig = {}, eventBus = null) => {
  draw._previewValidator = options.onGeometryPreview ?? pluginConfig.onGeometryPreview
  draw._commitValidator = options.onGeometryChange ?? pluginConfig.onGeometryChange
  draw._finishValidator = options.onGeometryFinish ?? pluginConfig.onGeometryFinish
  const heldId = getCommitChecks(draw).reset()
  if (heldId !== undefined) {
    const discarded = draw.get(heldId)
    draw.delete(heldId)
    eventBus?.emit('draw:cancelled', stripInternalProperties(discarded))
  }
}
