import { getCommitChecks } from '../validation/commitChecks.js'
import { isCheckedMode } from '../utils/drawModes.js'

/**
 * Check the current shape again, unchanged, by calling `onGeometryChange` with
 * `phase: 'recheck'`. Use it when the answer may have changed without the shape
 * changing (e.g. the user ignored a warning), or to retry a check that failed.
 *
 * Does nothing outside a draw/edit session, or before the shape has been checked.
 *
 * @param {object} context - plugin context
 * @param {*} [detail] - passed to `onGeometryChange` as `event.detail`, e.g. to say why
 * @returns {boolean} whether a check was started
 */
export const recheckGeometry = ({ mapProvider }, detail) => {
  const { draw } = mapProvider

  if (!draw) {
    return false
  }

  const mode = draw.getMode()
  const checks = getCommitChecks(draw)
  const { feature } = checks.state
  if (!isCheckedMode(mode) || !feature) {
    return false
  }

  const context = { phase: 'recheck', mode, ...(detail !== undefined && { detail }) }
  checks.run({ feature, context, onGeometryChange: draw._commitValidator })
  return true
}
