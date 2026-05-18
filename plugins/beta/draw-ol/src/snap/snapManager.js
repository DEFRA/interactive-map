/**
 * Snap manager — orchestrates the snap engine, indicator, and OL interaction.
 *
 * Returned as manager.snap; null when no snapLayers are configured.
 *
 * Interface used by draw and edit modes:
 *   snap.apply(coord)     — query + show/hide indicator; returns snapped coord or original
 *   snap.hideIndicator()  — explicit hide (e.g. on touch/keyboard commit)
 *   snap.setActive(bool)  — enable / disable (wired to the UI snap toggle)
 *   snap.reattach()       — re-add the OL interaction after a mode change so it stays
 *                           last-added (= first to process pointermove events)
 *   snap.destroy()        — full cleanup
 */

import { createSnapEngine, SNAP_RADIUS_PX } from './snapEngine.js'
import { createSnapIndicator } from './snapIndicator.js'
import { createSnapInteraction } from './snapInteraction.js'

export const createSnapManager = (map, snapLayers, colors) => {
  if (!snapLayers?.length) {
    return null
  }

  const engine = createSnapEngine(map, snapLayers)
  const indicator = createSnapIndicator(map, colors)
  const interaction = createSnapInteraction(engine, indicator)

  map.addInteraction(interaction)
  interaction.setActive(false) // matches reducer initial state: snap: false

  let active = false

  return {
    /**
     * Apply snap at coord. Updates the indicator and returns the snapped
     * coordinate, or the original coordinate when no snap candidate is found.
     * Returns original coord unchanged when snap is disabled.
     */
    apply (coord) {
      if (!active) return coord
      const result = engine.query(coord, SNAP_RADIUS_PX)
      if (result) {
        indicator.show(result.coord, result.type)
        return result.coord
      }
      indicator.hide()
      return coord
    },

    hideIndicator () {
      indicator.hide()
    },

    setActive (value) {
      active = value
      interaction.setActive(value)
      if (!value) {
        indicator.hide()
      }
    },

    /**
     * Remove and re-add the OL interaction so it sits at the top of the
     * interaction stack (last-added = first to handle pointermove).
     * Call after each changeMode() so the interaction always runs before
     * the newly added Draw or Modify interaction.
     */
    reattach () {
      map.removeInteraction(interaction)
      map.addInteraction(interaction)
    },

    updateColors (newColors) {
      indicator.updateColors(newColors)
    },

    destroy () {
      map.removeInteraction(interaction)
      indicator.remove()
    }
  }
}
