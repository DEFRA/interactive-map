import { useState, useEffect } from 'react'

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
