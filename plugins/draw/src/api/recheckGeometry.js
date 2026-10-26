import { getCommitChecks } from '../validation/commitChecks.js'

const CHECKED_MODES = new Set(['draw_polygon', 'draw_line', 'edit_vertex', 'edit_point'])

/**
 * Check the current shape again, unchanged, by calling `onGeometryChange` with
 * `phase: 'recheck'`. Use it when the answer may have changed without the shape
 * changing (e.g. the user ignored a warning), or to retry a check that failed.
 *
 * Does nothing outside a draw/edit session, or before the shape has been checked.
 *
 * @param {object} context - plugin context
 * @returns {boolean} whether a check was started
 */
export const recheckGeometry = ({ mapProvider }) => {
  const { draw } = mapProvider

  if (!draw) {
    return false
  }

  const mode = draw.getMode()
  const checks = getCommitChecks(draw)
  const { feature } = checks.state
  if (!CHECKED_MODES.has(mode) || !feature) {
    return false
  }

  checks.run({ feature, context: { phase: 'recheck', mode }, onGeometryChange: draw._commitValidator })
  return true
}
