import React, { useEffect, useState, useMemo } from 'react'
import { stringToKebab } from '../../../utils/stringToKebab'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'
import { Icon } from '../Icon/Icon'
import { useEvaluateProp } from '../../hooks/useEvaluateProp.js'

/**
 * PopupMenu — accessible keyboard-navigable dropdown menu component.
 * Renders a role=menu list with selected item highlighting, keyboard nav (arrows/Home/End/Enter),
 * and closes-on-outside-click/focus behavior. Skips hidden items during navigation.
 *
 * @component
 * @param {string} popupMenuId
 *   Unique identifier for the menu element and item IDs (items get id={id}-item-{i})
 * @param {string} pluginId
 *   Identifier for the owning plugin, passed to evaluateProp for context
 * @param {string} buttonId
 *   Ref key of the button that triggered this menu; used to manage focus and detect outside clicks
 * @param {string} [startPos]
 *   Initial selection strategy: 'first' (first visible), 'last' (last visible), or null/undefined (no selection)
 * @param {number} [startIndex]
 *   Exact index to select on mount; takes precedence over startPos
 * @param {MutableRefObject} menuRef
 *   Ref to the menu UL element; used for focus management and click-outside detection
 * @param {Array} items
 *   Array of menu items {id, label, onClick, iconId?, iconSvgContent?, pressedWhen?} to render
 * @param {Function} setIsOpen
 *   Callback to close the menu (called with false when user presses Escape/Tab or clicks outside)
 * @returns {JSX.Element}
 *   A role=menu UL with keyboard handlers and visible=filtered LI children
 */
// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const PopupMenu = ({ popupMenuId, buttonId, instigatorId, pluginId, startPos, startIndex, menuRef, items, setIsOpen }) => {
  const { id } = useConfig()
  const { buttonRefs, buttonConfig, hiddenButtons, disabledButtons, pressedButtons } = useApp()
  const instigatorKey = buttonId ?? instigatorId
  const instigator = buttonRefs.current[instigatorKey]
  const evaluateProp = useEvaluateProp()

  /**
   * Compute visible item indices by filtering out items in hiddenButtons.
   * Memoized on items and hiddenButtons to avoid recomputation.
   */
  const visibleIndices = useMemo(() => {
    const visible = []
    items.forEach((item, idx) => {
      if (!hiddenButtons.has(item.id)) {
        visible.push(idx)
      }
    })
    return visible
  }, [items, hiddenButtons])

  /**
   * Initialize selected index from startIndex (exact value) or startPos ('first'/'last')
   * Falls back to -1 (no selection) if no initial value provided or all items are hidden.
   */
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

  /**
   * Helper: Close menu and return focus to instigator button.
   * @param {Event} e
   *   The event that triggered the close (may have preventDefault called)
   * @param {boolean} [preventDefault=false]
   *   Whether to call e.preventDefault() (true for Escape, false for Tab)
   */
  const closeAndFocus = (e, preventDefault = false) => {
    if (preventDefault && e?.preventDefault) {
      e.preventDefault()
    }
    instigator.focus()
    setIsOpen(false)
  }

  /**
   * Helper: Navigate visible items via ArrowDown/ArrowUp.
   * ArrowDown moves forward (wraps at end); ArrowUp moves backward (wraps at start).
   * When no selection (-1), ArrowDown picks first, ArrowUp picks last.
   * @param {KeyboardEvent} e
   *   Keyboard event (checked for ArrowDown/ArrowUp)
   */
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

  /**
   * Helper: Invoke a menu item's action via buttonConfig or item.onClick.
   * @param {Event} e - The triggering event
   * @param {Object} item - The item to activate
   */
  const activateItem = (e, item) => {
    const menuItemConfig = buttonConfig[item.id]
    if (typeof menuItemConfig?.onClick === 'function') {
      menuItemConfig.onClick(e, evaluateProp(ctx => ctx, pluginId))
    } else if (typeof item.onClick === 'function') {
      item.onClick(e.nativeEvent)
    }
    // For keyboard events, also dispatch a synthetic click so native window listeners fire
    // (e.g. editVertexMode.onButtonClick for delete/undo in edit_vertex mode).
    // Marked with _fromKeyboardActivation so handleItemClick ignores it and only the
    // window listener handles it — preventing double-activation.
    if (e.nativeEvent instanceof KeyboardEvent) {
      const el = document.getElementById(`${id}-${stringToKebab(item.id)}`)
      if (el) {
        const click = new MouseEvent('click', { bubbles: true, cancelable: true })
        click._fromKeyboardActivation = true
        el.dispatchEvent(click)
      }
    }
  }

  /**
   * Helper: Handle Enter key press.
   * Closes menu, returns focus to instigator, then activates the selected item if enabled.
   * @param {KeyboardEvent} e
   *   The Enter keydown event
   */
  const handleEnter = (e) => {
    e.preventDefault()
    const item = items[index]
    if (item && !disabledButtons.has(item.id)) {
      activateItem(e, item)
    }
    instigator.focus()
    setIsOpen(false)
  }

  /**
   * Helper: Handle Space key press.
   * For menuitemcheckbox: activates item only (menu stays open).
   * For menuitem: closes menu, returns focus to instigator, then activates item.
   * @param {KeyboardEvent} e
   *   The Space keydown event
   */
  const handleSpace = (e) => {
    e.preventDefault()
    const item = items[index]
    if (!item || disabledButtons.has(item.id)) {
      return
    }
    const isCheckbox = item.isPressed !== undefined || item.pressedWhen
    activateItem(e, item)
    if (!isCheckbox) {
      instigator.focus()
      setIsOpen(false)
    }
  }

  /**
   * Main keyboard handler for the menu.
   * Dispatches to helpers or directly handles:
   * - Escape/Esc: close & focus instigator
   * - Tab: close & focus instigator (without preventDefault)
   * - ArrowDown/ArrowUp: navigate visible items
   * - Home: select first visible
   * - End: select last visible
   * - Enter: call selected item's onClick & close
   * @param {KeyboardEvent} e
   *   Keyboard event from menu onKeyDown
   */
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
    if (e.key === ' ') {
      handleSpace(e)
    }
  }

  /**
   * Helper: Close menu if click/focus originated outside menu and instigator.
   * Registered on document focusin and pointerdown events to detect outside interactions.
   * @param {Event} e
   *   The focusin or pointerdown event
   */
  const handleOutside = (e) => {
    if (menuRef.current?.contains(e.target) || buttonRefs.current[instigatorKey]?.contains(e.target)) {
      return
    }
    setIsOpen(false)
  }

  /**
   * Helper: Handle item click.
   * Closes menu and activates the item; does nothing if the item is disabled.
   * @param {React.MouseEvent} e
   *   React synthetic event from the LI click
   * @param {Object} item
   *   The clicked item object with {id, label, onClick, ...}
   */
  const handleItemClick = (e, item) => {
    if (e.nativeEvent._fromKeyboardActivation) {
      return
    }
    if (disabledButtons.has(item.id)) {
      return
    }
    setIsOpen(false)
    activateItem(e, item)
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
      id={popupMenuId}
      className='im-c-popup-menu'
      role='menu' // NOSONAR
      tabIndex='-1'
      aria-labelledby={instigatorKey}
      aria-activedescendant={index >= 0 ? `${id}-${stringToKebab(items[index].id)}` : undefined}
      onKeyDown={handleMenuKeyDown}
    >
      {items.map((item, i) => (
        <li // NOSONAR
          key={item.id}
          id={`${id}-${stringToKebab(items[i].id)}`}
          className={`im-c-popup-menu__item${index === i ? ' im-c-popup-menu__item--selected' : ''}`}
          role={items[i].isPressed !== undefined || items[i].pressedWhen ? 'menuitemcheckbox' : 'menuitem'} // NOSONAR
          aria-disabled={disabledButtons.has(items[i].id) || undefined} // NOSONAR
          aria-checked={(items[i].isPressed !== undefined || items[i].pressedWhen) ? pressedButtons.has(items[i].id) : undefined} // NOSONAR
          style={hiddenButtons.has(items[i].id) ? { display: 'none' } : undefined}
          onClick={(e) => handleItemClick(e, items[i])} // NOSONAR
        >
          {(item.iconId || item.iconSvgContent) && <Icon id={item.iconId} svgContent={item.iconSvgContent} />}
          <span className='im-c-popup-menu__item-label'>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
