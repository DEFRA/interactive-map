import { useEffect, useRef } from 'react'

export function useResizeObserver (targetRefs, callback) {
  const frameRef = useRef()
  const prevSizes = useRef(new WeakMap()) // track sizes per element

  useEffect(() => {
    const refs = Array.isArray(targetRefs) ? targetRefs : [targetRefs]
    const elements = refs.map(r => r?.current).filter(Boolean)

    if (!elements.length || !callback) {
      return undefined
    }

    const observer = new window.ResizeObserver(entries => {
      const changedEntries = []

      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const prev = prevSizes.current.get(entry.target) || {}

        if (prev.width === width && prev.height === height) {
          continue // skip unchanged
        }

        prevSizes.current.set(entry.target, { width, height })
        changedEntries.push(entry)
      }

      if (changedEntries.length) {
        // Batch all entries into a single RAF — prevents multiple simultaneous
        // resize events (e.g. panel open) from queueing separate callbacks and
        // causing a ResizeObserver loop under synchronous renderers like preact.
        cancelAnimationFrame(frameRef.current)
        frameRef.current = requestAnimationFrame(() =>
          changedEntries.forEach(entry => callback(entry))
        )
      }
    })

    elements.forEach(el => observer.observe(el))

    return () => {
      observer.disconnect()
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [targetRefs, callback])

  return { frameRef }
}
