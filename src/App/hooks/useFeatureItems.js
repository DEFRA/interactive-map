import { useState, useEffect } from 'react'

/**
 * Subscribes to map:setfeatures and exposes the current listbox item list and multiselectable flag.
 * The list is produced by useMapItemList in the interact plugin and pushed via the event bus
 * whenever the visible set of markers or features changes.
 *
 * @param {object} eventBus
 * @returns {{ items: Array<{ id: string, label: string }>, multiselectable: boolean }}
 */
export function useFeatureItems (eventBus) {
  const [items, setItems] = useState([])
  const [multiselectable, setMultiselectable] = useState(false)

  useEffect(() => {
    if (!eventBus) {
      return undefined
    }
    const handle = ({ items: next = [], multiselectable: nextMultiselectable = false }) => {
      setItems(next)
      setMultiselectable(nextMultiselectable)
    }
    eventBus.on('map:setfeatures', handle)
    return () => {
      eventBus.off('map:setfeatures', handle)
    }
  }, [eventBus])

  return { items, multiselectable }
}
