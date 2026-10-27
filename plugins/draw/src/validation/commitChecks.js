import { validateGeometry, normaliseResult, withSource } from './validateGeometry.js'
import { COMMIT_RULES } from './rules.js'
import { logger } from '../../../../src/services/logger.js'

const IDLE = { revision: 0, status: 'idle', result: null, feature: null, context: null, slow: false, afterPending: false }

// How long an async check runs before it counts as slow: Done reads "Checking…" and the
// check is announced. A quicker reply settles without either.
export const SLOW_CHECK_MS = 300

const isThenable = (value) => typeof value?.then === 'function'

const statusFor = (result) => (result.valid ? 'valid' : 'invalid')

/**
 * Runs the commit-level check for each committed change: the built-in COMMIT_RULES first,
 * synchronously, then the consumer's `onGeometryChange`, which may return a Promise.
 *
 * Every run gets a new revision and aborts the previous run's signal. A result only
 * settles if its revision is still the latest, so a slow reply for an older shape can
 * never overwrite the verdict for the current one. `onSettle(state)` fires for each
 * settled state, including 'pending' as soon as an async check starts, and 'pending' again
 * with `slow: true` once it has run for SLOW_CHECK_MS. A result that follows a slow
 * 'pending' state for the same revision has `afterPending: true`.
 *
 * Lives per draw adapter (see getCommitChecks) rather than in events.js's handlers,
 * which are rebuilt on every plugin state change.
 *
 * States: 'idle' | 'pending' | 'valid' | 'invalid' | 'error'
 *
 * @returns {{ run: Function, reset: Function, setSink: Function, readonly state: object }}
 */
export const createCommitChecks = () => {
  let revision = 0
  let slowRevision = null
  let slowTimer = null
  let abortController = null
  let latest = IDLE
  let sink = null

  const abortPending = () => {
    abortController?.abort()
    abortController = null
    clearTimeout(slowTimer)
  }

  const settle = (rev, next) => {
    if (rev !== revision) { return }
    if (next.status !== 'pending') {
      abortController = null
      clearTimeout(slowTimer)
    }
    const slow = !!next.slow
    const afterPending = next.status !== 'pending' && slowRevision === rev
    slowRevision = slow ? rev : null
    latest = { ...next, revision: rev, slow, afterPending }
    sink?.(latest)
  }

  return {
    get state () { return latest },

    setSink (fn) { sink = fn },

    /**
     * @param {object} params
     * @param {object} params.feature - the committed GeoJSON feature
     * @param {object} params.context - { phase, mode, vertexIndex }
     * @param {Function} [params.onGeometryChange] - consumer callback
     * @param {Array<Function>} [params.rules] - built-in rules, defaults to COMMIT_RULES
     */
    run ({ feature, context, onGeometryChange, rules = COMMIT_RULES }) {
      abortPending()
      revision++
      const rev = revision
      const base = { feature, context }

      const builtIn = validateGeometry(feature, context, { rules })
      if (!builtIn.valid || typeof onGeometryChange !== 'function') {
        settle(rev, { ...base, status: statusFor(builtIn), result: builtIn })
        return
      }

      const controller = new AbortController()
      abortController = controller
      const onError = (error) => {
        // A superseded check rejecting (e.g. on its aborted signal) isn't a failure
        if (rev !== revision) { return }
        logger.warn('[draw] onGeometryChange failed', error)
        settle(rev, { ...base, status: 'error', result: { valid: false, reason: null, source: 'callback' }, error })
      }

      let output
      try {
        output = onGeometryChange({ feature, ...context }, { signal: controller.signal, revision: rev })
      } catch (error) {
        onError(error)
        return
      }

      const settleResult = (value) => {
        const result = withSource(normaliseResult(value), 'callback')
        settle(rev, { ...base, status: statusFor(result), result })
      }

      if (!isThenable(output)) {
        settleResult(output)
        return
      }

      settle(rev, { ...base, status: 'pending', result: null })
      slowTimer = setTimeout(() => settle(rev, { ...base, status: 'pending', result: null, slow: true }), SLOW_CHECK_MS)
      output.then(settleResult, onError)
    },

    // Ends the session: aborts any check in flight and drops whatever it returns.
    reset () {
      abortPending()
      revision++
      latest = IDLE
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
 * Starts a draw/edit session's checks: installs the session's two callbacks on the
 * adapter and ends any previous session's check. A per-call callback replaces the
 * plugin-level one.
 *
 *   - `draw._previewValidator` — onGeometryPreview, read by the adapters for the
 *     'preview' and 'place' phases
 *   - `draw._commitValidator`  — onGeometryChange, read by events.js for committed changes
 */
export const startCheckSession = (draw, options = {}, pluginConfig = {}) => {
  draw._previewValidator = options.onGeometryPreview ?? pluginConfig.onGeometryPreview
  draw._commitValidator = options.onGeometryChange ?? pluginConfig.onGeometryChange
  getCommitChecks(draw).reset()
}
