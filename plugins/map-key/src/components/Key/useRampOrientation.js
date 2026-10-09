import { useLayoutEffect, useState } from 'react'

export const HORIZONTAL = 'horizontal'
export const VERTICAL = 'vertical'

let measureContext
const getMeasureContext = () => {
  if (measureContext === undefined) {
    measureContext = document.createElement('canvas').getContext('2d') ?? null
  }
  return measureContext
}

// Whether every label fits on one line in an equal share of the list's width. Both ramp
// orientations share the list's side padding and gap, so the result doesn't depend on which
// orientation is currently rendered. Returns null when there's nothing to measure yet.
const labelsFitHorizontally = (list, labels) => {
  const label = list.querySelector('.im-c-map-key-list__item-label')
  const context = getMeasureContext()
  if (!label || !context || !list.clientWidth) {
    return null
  }
  const { fontStyle, fontWeight, fontSize, fontFamily } = getComputedStyle(label)
  context.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`
  const listStyle = getComputedStyle(list)
  const gap = Number.parseFloat(listStyle.columnGap) || 0
  const padding = (Number.parseFloat(listStyle.paddingLeft) || 0) + (Number.parseFloat(listStyle.paddingRight) || 0)
  const columnWidth = (list.clientWidth - padding - gap * (labels.length - 1)) / labels.length
  return labels.every(text => context.measureText(text).width <= columnWidth)
}

// A ramp is horizontal when every label fits on one line under its band, otherwise vertical.
// Measured before paint, and again when the list resizes or web fonts finish loading.
export const useRampOrientation = (listRef, labels, isRamp, hasStroke) => {
  const [fits, setFits] = useState(true)
  const labelsKey = labels.join('\n')

  useLayoutEffect(() => {
    const list = listRef.current
    if (!isRamp || !list) {
      return undefined
    }
    let active = true
    const update = () => {
      const result = active ? labelsFitHorizontally(list, labels) : null
      if (result !== null) {
        setFits(result)
      }
    }
    update()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    observer?.observe(list)
    document.fonts?.ready.then(update, () => {})
    return () => {
      active = false
      observer?.disconnect()
    }
  }, [isRamp, hasStroke, labelsKey])

  return fits ? HORIZONTAL : VERTICAL
}
