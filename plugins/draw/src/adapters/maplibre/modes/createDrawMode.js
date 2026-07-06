import { createLifecycle } from './drawMode/lifecycle.js'
import { createClickHandlers } from './drawMode/clickHandlers.js'
import { createUndoHandlers } from './drawMode/undoHandlers.js'
import { createKeyboardHandlers } from './drawMode/keyboardHandlers.js'
import { createPointerHandlers } from './drawMode/pointerHandlers.js'
import { createRenderHelpers } from './drawMode/renderHelpers.js'

/**
 * Factory function to create a draw mode for either polygons or lines.
 * Shared behaviour (event handling, snap detection, undo, rubber band, keyboard
 * drawing) is split across ./drawMode/* handler modules and composed here.
 *
 * @param {Object} ParentMode - DrawPolygon or DrawLineString from mapbox-gl-draw
 * @param {Object} config - Configuration for the mode
 * @param {string} config.featureProp - Property name on state ('polygon' or 'line')
 * @param {string} config.geometryType - 'Polygon' or 'LineString'
 * @param {Function} config.getCoords - Function to get coordinates from feature
 * @param {Function} config.validateClick - Validation function for clicks
 * @param {Function} config.getPlacedCoords - Function to get placed vertex coordinates from a display geojson
 */
export const createDrawMode = (ParentMode, config) => {
  const {
    featureProp,
    geometryType,
    getCoords,
    validateClick,
    getPlacedCoords,
    excludeFeatureIdFromSetup = false,
    finishOnInvalidClick = false // For lines: finish when clicking same spot (like double-click)
  } = config

  const deps = {
    ParentMode,
    featureProp,
    geometryType,
    getCoords,
    validateClick,
    getPlacedCoords,
    excludeFeatureIdFromSetup,
    finishOnInvalidClick,
    getFeature: (state) => state[featureProp],
    // ring is [...placed, last_placed, rubber_band]; splice(-2,1) removes last_placed
    RUBBER_BAND_OFFSET: 2,
    // Only these keys signal a switch to keyboard drawing (matches the OL adapter's
    // drawInput) — modifier keys and shortcut chords like cmd+z must not show the crosshair
    INTERFACE_KEYS: new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'])
  }

  return {
    ...ParentMode,
    ...createLifecycle(deps),
    ...createClickHandlers(deps),
    ...createUndoHandlers(deps),
    ...createKeyboardHandlers(deps),
    ...createPointerHandlers(deps),
    ...createRenderHelpers(deps)
  }
}
