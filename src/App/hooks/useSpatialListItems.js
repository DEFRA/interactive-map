import { useState, useEffect } from 'react'

const SET_SPATIAL_LIST = 'map:setspatiallist'
const SET_SPATIAL_LIST_SUPPRESSED = 'map:setspatiallistsuppressed'

/**
 * Subscribes to map:setspatiallist for the listbox item list, and
 * map:setspatiallistsuppressed (any plugin can emit this) to report items as empty while
 * suppressed regardless of what's actually visible — which is what drives <SpatialList>'s own
 * tabIndex/aria-hidden.
 *
 * Items always carry at least { id, label, x?, y? } — SpatialList.jsx/useSpatialListFocus.js
 * only ever read those. Whichever plugin currently owns the list (via spatialListRegistry —
 * interact today, draw's edit-mode vertices in future) may include further fields of its own
 * on each item; those simply ride along unused here. `label` is that same owner's own name for
 * what the list currently represents (e.g. "Map features", or "Shape points" while draw holds
 * an exclusive claim) — see spatialListRegistry.js.
 *
 * @param {object} eventBus
 * @returns {{ items: Array<{ id: string, label: string, x?: number, y?: number }>, multiselectable: boolean, label: string|undefined }}
 */
export function useSpatialListItems (eventBus) {
  const [items, setItems] = useState([])
  const [multiselectable, setMultiselectable] = useState(false)
  const [label, setLabel] = useState(undefined)
  const [suppressed, setSuppressed] = useState(false)

  useEffect(() => {
    if (!eventBus) {
      return undefined
    }
    const handleSetSpatialList = ({ items: next = [], multiselectable: nextMultiselectable = false, label: nextLabel } = {}) => {
      setItems(next)
      setMultiselectable(nextMultiselectable)
      setLabel(nextLabel)
    }
    const handleSuppressed = ({ suppressed: next = false } = {}) => {
      setSuppressed(next)
    }
    eventBus.on(SET_SPATIAL_LIST, handleSetSpatialList)
    eventBus.on(SET_SPATIAL_LIST_SUPPRESSED, handleSuppressed)
    return () => {
      eventBus.off(SET_SPATIAL_LIST, handleSetSpatialList)
      eventBus.off(SET_SPATIAL_LIST_SUPPRESSED, handleSuppressed)
    }
  }, [eventBus])

  return { items: suppressed ? [] : items, multiselectable, label }
}
