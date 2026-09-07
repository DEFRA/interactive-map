import { useState, useEffect } from 'react'

const SET_FEATURES = 'map:setfeatures'
const SET_FEATURES_SUPPRESSED = 'map:setfeaturessuppressed'

/**
 * Subscribes to map:setfeatures for the listbox item list, and map:setfeaturessuppressed
 * (any plugin can emit this) to report items as empty while suppressed regardless of what's
 * actually visible — which is what drives <Features>'s own tabIndex/aria-hidden.
 *
 * @param {object} eventBus
 * @returns {{ items: Array<{ id: string, label: string, x?: number, y?: number }>, multiselectable: boolean }}
 */
export function useFeatureItems (eventBus) {
  const [items, setItems] = useState([])
  const [multiselectable, setMultiselectable] = useState(false)
  const [suppressed, setSuppressed] = useState(false)

  useEffect(() => {
    if (!eventBus) {
      return undefined
    }
    const handleSetFeatures = ({ items: next = [], multiselectable: nextMultiselectable = false }) => {
      setItems(next)
      setMultiselectable(nextMultiselectable)
    }
    const handleSuppressed = ({ suppressed: next = false } = {}) => {
      setSuppressed(next)
    }
    eventBus.on(SET_FEATURES, handleSetFeatures)
    eventBus.on(SET_FEATURES_SUPPRESSED, handleSuppressed)
    return () => {
      eventBus.off(SET_FEATURES, handleSetFeatures)
      eventBus.off(SET_FEATURES_SUPPRESSED, handleSuppressed)
    }
  }, [eventBus])

  return { items: suppressed ? [] : items, multiselectable }
}
