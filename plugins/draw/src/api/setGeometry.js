import { isEditMode } from '../utils/drawModes.js'

// Not structuredClone: it's missing from older browsers we still support, and coordinates
// are plain arrays of numbers, which JSON copies exactly
const copyCoordinates = (coordinates) => JSON.parse(JSON.stringify(coordinates)) // NOSONAR

/**
 * Replace the shape being edited, e.g. with a corrected boundary. The change can be
 * undone and is checked like any other, with `phase: 'change'`.
 *
 * Does nothing outside an edit session, or when the geometry type differs from the
 * shape being edited.
 *
 * @param {object} context - plugin context
 * @param {object} geometry - GeoJSON geometry of the same type as the edited shape
 * @returns {boolean} whether the shape was replaced
 */
export const setGeometry = ({ mapProvider, pluginState }, geometry) => {
  const { draw } = mapProvider

  if (!draw || !isEditMode(draw.getMode())) {
    return false
  }

  const current = draw.get(pluginState.feature?.id)
  if (!current || current.geometry?.type !== geometry?.type) {
    return false
  }

  // Copied so later changes to the caller's object can't reach the edited shape
  draw.setGeometry({ type: geometry.type, coordinates: copyCoordinates(geometry.coordinates) })
  return true
}
