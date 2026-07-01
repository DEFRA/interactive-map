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

const SNAP_EVENTS = new Set(['pointermove', 'pointerdrag', 'pointerdown', 'pointerup', 'singleclick', 'click'])

const processSnapEvent = (mapBrowserEvent, engine, indicator, snapRadius, isIndicatorActive) => {
  const { type } = mapBrowserEvent

  if (type === 'pointerout' || type === 'pointerleave') {
    indicator.hide()
    return
  }

  if (!SNAP_EVENTS.has(type)) {
    return
  }

  const result = engine.query(mapBrowserEvent.coordinate, snapRadius)
  if (result) {
    mapBrowserEvent.coordinate = result.coord.slice()
  }

  // Only update indicator during free mouse movement — hide during drag, no-op for clicks
  if (type === 'pointermove' && isIndicatorActive()) {
    result ? indicator.show(result.coord, result.type) : indicator.hide()
  } else if (type === 'pointerdrag') {
    indicator.hide()
  } else {
    // no indicator update for click/down/up events
  }
}

export const createSnapInteraction = (engine, indicator, snapRadius, isIndicatorActive) => {
  const interaction = new Interaction({
    handleEvent (mapBrowserEvent) {
      if (interaction.getActive()) {
        processSnapEvent(mapBrowserEvent, engine, indicator, snapRadius, isIndicatorActive)
      }
      return true
    }
  })

  return interaction
}
