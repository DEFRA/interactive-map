import React, { useEffect, useState, useMemo } from 'react'
import { useApp } from '../../store/appContext'
import { Icon } from '../Icon/Icon'
import { useEvaluateProp } from '../../hooks/useEvaluateProp.js'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const PopupMenu = ({ id, pluginId, instigatorId, startPos, startIndex, menuRef, items, setIsOpen }) => {
  const { buttonRefs, buttonConfig, hiddenButtons, disabledButtons, pressedButtons } = useApp()
  const instigator = buttonRefs.current[instigatorId]
  const evaluateProp = useEvaluateProp()

  // Compute visible item indices (skip hidden items) and memoize
  const visibleIndices = useMemo(() => {
    const visible = []
    items.forEach((item, idx) => {
      if (!hiddenButtons.has(item.id)) {
        visible.push(idx)
      }
    })
    return visible
  }, [items, hiddenButtons])

  // Initialize index using startIndex if provided, otherwise derive from startPos
  const [index, setIndex] = useState(() => {
    if (typeof startIndex === 'number') {
      return startIndex
    }
    if (startPos === 'first') {
      return visibleIndices[0] ?? -1
    }
    if (startPos === 'last') {
      return visibleIndices[visibleIndices.length - 1] ?? -1
    }
    return -1
  })

  // Helpers
  const closeAndFocus = (e, preventDefault = false) => {
    if (preventDefault && e?.preventDefault) {
      e.preventDefault()
    }
    instigator.focus()
    setIsOpen(false)
  }

  const navigateVisible = (e) => {
    e.preventDefault()
    const vis = visibleIndices
    const n = vis.length
    if (n === 0) {
      return
    }
    const pos = vis.indexOf(index)
    let nextPos
    if (e.key === 'ArrowDown') {
      nextPos = pos === -1 ? 0 : (pos + 1) % n
    } else if (pos === -1) {
      nextPos = n - 1
    } else {
      nextPos = (pos - 1 + n) % n
    }
    setIndex(vis[nextPos])
  }

  const handleEnter = (e) => {
    e.preventDefault()
    instigator.focus()
    setIsOpen(false)
    items[index]?.onClick()
  }

  const handleMenuKeyDown = (e) => {
    if (['Escape', 'Esc'].includes(e.key)) {
      closeAndFocus(e, true)
      return
    }
    if (e.key === 'Tab') {
      closeAndFocus(e)
      return
    }
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      navigateVisible(e)
      return
    }
    if (e.key === 'Home' && visibleIndices.length) {
      setIndex(visibleIndices[0])
      return
    }
    if (e.key === 'End' && visibleIndices.length) {
      setIndex(visibleIndices[visibleIndices.length - 1])
      return
    }
    if (e.key === 'Enter') {
      handleEnter(e)
    }
  }

  const handleOutside = (e) => {
    if (menuRef.current?.contains(e.target) || buttonRefs.current[instigatorId]?.contains(e.target)) {
      return
    }
    setIsOpen(false)
  }

  const handleItemClick = (e, item) => {
    const menuItemConfig = buttonConfig[item.id]
    setIsOpen(false)
    if (typeof menuItemConfig?.onClick !== 'function') {
      item?.onClick()
      return
    }
    menuItemConfig.onClick(e, evaluateProp(ctx => ctx, pluginId))
  }

  useEffect(() => {
    menuRef.current?.focus()

    // If startPos changes on mount, ensure selection respects visible items.
    if (startPos === 'first') {
      setIndex(visibleIndices[0] ?? -1)
    } else if (startPos === 'last') {
      setIndex(visibleIndices[visibleIndices.length - 1] ?? -1)
    } else {
      // No action
    }

    document.addEventListener('focusin', handleOutside)
    document.addEventListener('pointerdown', handleOutside)

    return () => {
      document.removeEventListener('focusin', handleOutside)
      document.removeEventListener('pointerdown', handleOutside)
    }
  }, [])

  return (
    <ul // NOSONAR
      ref={menuRef}
      id={id}
      className='fm-c-popup-menu'
      role='menu' // NOSONAR
      tabIndex='-1'
      aria-labelledby={id}
      aria-activedescendant={`${id}-item-${index}`}
      onKeyDown={handleMenuKeyDown}
    >
      {items.map((item, i) => (
        <li // NOSONAR
          key={item.id}
          id={`${id}-item-${i}`}
          className={`fm-c-popup-menu__item${index === i ? ' fm-c-popup-menu__item--selected' : ''}`}
          role='menuitem' // NOSONAR
          aria-disabled={disabledButtons.has(items[i].id) || undefined} // NOSONAR
          aria-pressed={typeof items[i].pressedWhen === 'function' ? pressedButtons.has(items[i].id) : undefined} // NOSONAR
          style={hiddenButtons.has(items[i].id) ? { display: 'none' } : undefined}
          onClick={(e) => handleItemClick(e, items[i])} // NOSONAR
        >
          {(item.iconId || item.iconSvgContent) && <Icon id={item.iconId} svgContent={item.iconSvgContent} />}
          <span className='fm-c-popup-menu__item-label'>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
