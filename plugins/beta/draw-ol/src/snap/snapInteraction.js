/**
 * Custom OL Interaction that intercepts pointer events and rewrites
 * mapBrowserEvent.coordinate to the nearest snap candidate before any draw
 * or modify interaction sees it.
 *
 * Coordinate snapping applies to all pointer events (pointermove, pointerdown,
 * pointerup, singleclick) so that both rubberbanding and vertex placement are snapped.
 * The visual indicator is only updated on pointermove.
 *
 * Must be added to the map AFTER the Draw/Modify interaction so it is processed
 * first (OL iterates interactions in reverse-add order).
 * snapManager.reattach() handles this after each mode change.
 */

import Interaction from 'ol/interaction/Interaction.js'
import { SNAP_RADIUS_PX } from './snapEngine.js'

const SNAP_EVENTS = new Set(['pointermove', 'pointerdrag', 'pointerdown', 'pointerup', 'singleclick', 'click'])

export const createSnapInteraction = (engine, indicator) => {
  const interaction = new Interaction({
    handleEvent (mapBrowserEvent) {
      if (!interaction.getActive()) {
        return true
      }

      const { type } = mapBrowserEvent

      if (type === 'pointerout' || type === 'pointerleave') {
        indicator.hide()
        return true
      }

      if (!SNAP_EVENTS.has(type)) {
        return true
      }

      const result = engine.query(mapBrowserEvent.coordinate, SNAP_RADIUS_PX)
      if (result) {
        mapBrowserEvent.coordinate = result.coord.slice()
      }

      // Only show indicator during free mouse movement — hide during drag and clicks
      if (type === 'pointermove') {
        result ? indicator.show(result.coord, result.type) : indicator.hide()
      } else if (type === 'pointerdrag') {
        indicator.hide()
      }

      return true
    }
  })

  return interaction
}
