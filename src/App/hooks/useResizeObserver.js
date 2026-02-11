import { useEffect, useRef } from 'react'

export function useResizeObserver (targetRefs, callback) {
  const frameRef = useRef()
  const prevSizes = useRef(new WeakMap()) // track sizes per element

  useEffect(() => {
    const refs = Array.isArray(targetRefs) ? targetRefs : [targetRefs]
    const elements = refs.map(r => r?.current).filter(Boolean)

    if (!elements.length || !callback) {
      return
    }

    const observer = new window.ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const prev = prevSizes.current.get(entry.target) || {}

        if (prev.width === width && prev.height === height) {
          continue // skip unchanged
        }

        prevSizes.current.set(entry.target, { width, height })

        callback(entry)
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
