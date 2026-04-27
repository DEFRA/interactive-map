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
    eventBus.on('features:setItems', handle)
    return () => {
      eventBus.off('features:setItems', handle)
    }
  }, [eventBus])

  return items
}
