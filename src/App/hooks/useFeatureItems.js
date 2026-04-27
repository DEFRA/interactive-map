import { useState, useEffect } from 'react'

export function useFeatureItems (eventBus) {
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!eventBus) {
      return undefined
    }
    const handle = ({ items: next = [] }) => {
      setItems(next)
    }
    eventBus.on('map:setfeatures', handle)
    return () => {
      eventBus.off('map:setfeatures', handle)
    }
  }, [eventBus])

  return items
}
