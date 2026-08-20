/**
 * Custom OL Interaction that intercepts pointer events and rewrites
 * mapBrowserEvent.coordinate to the nearest snap candidate before any draw
 * or modify interaction sees it.
 *
 * The visual indicator updates on both pointermove (hover preview) and pointerdrag (an active
 * OL Modify drag), staying visible through to release — nothing hides it on release; it only
 * clears on a fresh query, a mode change, or snapping being switched off.
 *
 * Must be added to the map AFTER the Draw/Modify interaction so it is processed
 * first (OL iterates interactions in reverse-add order).
 * snapManager.reattach() handles this after each mode change.
 */

import Interaction from 'ol/interaction/Interaction.js'

const SNAP_EVENTS = new Set(['pointermove', 'pointerdrag', 'pointerdown', 'pointerup', 'singleclick', 'click'])
const INDICATOR_EVENTS = new Set(['pointermove', 'pointerdrag'])

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

  // Hover preview and active drag both keep the indicator live; no update for click/down/up.
  if (INDICATOR_EVENTS.has(type) && isIndicatorActive()) {
    result ? indicator.show(result.coord, result.type) : indicator.hide()
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
