import { useState, useMemo, useEffect } from 'react'
import { stringToKebab } from '../../../utils/stringToKebab.js'

/**
 * Computes the position and alignment style for the popup menu based on the
 * triggering button's bounding rect. Positions above/below and left/center/right
 * depending on which third of the screen the button centre falls in.
 *
 * @param {DOMRect|null} buttonRect - Bounding rect of the trigger button, or null.
 * @returns {{ style: object, direction: string, halign: string }}
 */
const getMenuStyle = (buttonRect) => {
  if (!buttonRect) {
    return { style: {}, direction: 'below' }
  }
  const style = {}
  let direction
  if (buttonRect.top >= window.innerHeight / 2) {
    style.bottom = `${window.innerHeight - buttonRect.top}px`
    direction = 'above'
  } else {
    style.top = `${buttonRect.bottom}px`
    direction = 'below'
  }
  const buttonCenterX = (buttonRect.left + buttonRect.right) / 2
  let halign
  if (buttonCenterX > (window.innerWidth * 2) / 3) { // NOSONAR, third of a page width
    style.right = `${window.innerWidth - buttonRect.right}px`
    halign = 'right'
  } else if (buttonCenterX < window.innerWidth / 3) { // NOSONAR, third of a page width
    style.left = `${buttonRect.left}px`
    halign = 'left'
  } else {
    style.left = `${buttonCenterX}px`
    halign = 'center'
  }
  return { style, direction, halign }
}

/**
 * Invokes an item's action via buttonConfig.onClick (if configured) or item.onClick.
 * For keyboard-triggered activations also dispatches a synthetic MouseEvent so that
 * any window-level click listeners (e.g. editVertexMode) fire as expected.
 * The synthetic event is marked _fromKeyboardActivation so handleItemClick can
 * ignore it and avoid double-activation.
 *
 * @param {React.SyntheticEvent} e   - The triggering React event.
 * @param {object}               item - The item being activated.
 * @param {object}               ctx  - Dependencies: { buttonConfig, evaluateProp, pluginId, id }.
 */
const activateItem = (e, item, { buttonConfig, evaluateProp, pluginId, id }) => {
  const menuItemConfig = buttonConfig[item.id]
  if (typeof menuItemConfig?.onClick === 'function') {
    menuItemConfig.onClick(e, evaluateProp(ctx => ctx, pluginId))
  } else if (typeof item.onClick === 'function') {
    item.onClick(e.nativeEvent)
  } else {
    // No action
  }
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
 * Builds the keydown handler for the menu UL. Handles Escape/Tab (close & focus),
 * ArrowDown/Up (navigate visible items), Home/End (jump to ends),
 * Enter (activate and close), Space (activate; close only for non-checkbox items).
 *
 * @param {object}   p
 * @param {Array}    p.items           - All menu item descriptors.
 * @param {number[]} p.visibleIndices  - Indices of non-hidden items.
 * @param {number}   p.index           - Currently highlighted index.
 * @param {Function} p.setIndex        - State setter for highlighted index.
 * @param {Set}      p.disabledButtons - IDs of disabled items.
 * @param {object}   p.instigator      - DOM node of the trigger button.
 * @param {Function} p.setIsOpen       - Callback to close the menu.
 * @param {object}   p.activateCtx     - Context passed through to activateItem.
 * @returns {Function} onKeyDown handler for the menu element.
 */
const createMenuKeyDownHandler = ({ items, visibleIndices, index, setIndex, disabledButtons, instigator, setIsOpen, activateCtx }) => {
  const closeAndFocus = (e, preventDefault = false) => {
    if (preventDefault && e?.preventDefault) {
      e.preventDefault()
    }
    instigator.focus()
    setIsOpen(false)
  }

  const navigateVisible = (e) => {
    e.preventDefault()
    const n = visibleIndices.length
    if (n === 0) {
      return
    }
    const pos = visibleIndices.indexOf(index)
    let nextPos
    if (e.key === 'ArrowDown') {
      nextPos = pos === -1 ? 0 : (pos + 1) % n
    } else if (pos === -1) {
      nextPos = n - 1
    } else {
      nextPos = (pos - 1 + n) % n
    }
    setIndex(visibleIndices[nextPos])
  }

  const handleEnter = (e) => {
    e.preventDefault()
    const item = items[index]
    if (item && !disabledButtons.has(item.id)) {
      activateItem(e, item, activateCtx)
    }
    instigator.focus()
    setIsOpen(false)
  }

  const handleSpace = (e) => {
    e.preventDefault()
    const item = items[index]
    if (!item || disabledButtons.has(item.id)) {
      return
    }
    activateItem(e, item, activateCtx)
    if (!(item.isPressed !== undefined || item.pressedWhen)) {
      instigator.focus()
      setIsOpen(false)
    }
  }

  return (e) => {
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
}

/**
 * Custom hook encapsulating all state and event-handler logic for PopupMenu.
 *
 * @param {object}   params
 * @param {Array}    params.items            - Menu item descriptors.
 * @param {Set}      params.hiddenButtons    - IDs of items that should not be visible.
 * @param {number}   [params.startIndex]     - Exact index to select on mount; takes precedence over startPos.
 * @param {string}   [params.startPos]       - 'first' | 'last' — initial selection strategy.
 * @param {object}   params.instigator       - DOM node of the button that opened the menu.
 * @param {string}   params.instigatorKey    - Key used to look up instigator in buttonRefs.
 * @param {object}   params.buttonRefs       - Ref map of all registered button DOM nodes.
 * @param {object}   params.buttonConfig     - Config map that may override item onClick handlers.
 * @param {Set}      params.disabledButtons  - IDs of currently disabled items.
 * @param {string}   params.pluginId         - Plugin context passed to evaluateProp.
 * @param {Function} params.evaluateProp     - Context evaluator from useEvaluateProp.
 * @param {string}   params.id               - App-level ID prefix for DOM element IDs.
 * @param {object}   params.menuRef          - Ref to the menu UL element.
 * @param {Function} params.setIsOpen        - Callback to open/close the menu.
 * @param {DOMRect}  params.buttonRect       - Bounding rect of the trigger button for positioning.
 * @returns {{ index: number, handleMenuKeyDown: Function, handleItemClick: Function,
 *             menuStyle: object, menuDirection: string, menuHAlign: string }}
 */
export const usePopupMenu = ({
  items, hiddenButtons, startIndex, startPos, instigator, instigatorKey,
  buttonRefs, buttonConfig, disabledButtons, pluginId, evaluateProp, id, menuRef, setIsOpen, buttonRect
}) => {
  const visibleIndices = useMemo(() => {
    const visible = []
    items.forEach((item, idx) => {
      if (!hiddenButtons.has(item.id)) {
        visible.push(idx)
      }
    })
    return visible
  }, [items, hiddenButtons])

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

  const activateCtx = { buttonConfig, evaluateProp, pluginId, id }

  const handleMenuKeyDown = createMenuKeyDownHandler({
    items, visibleIndices, index, setIndex, disabledButtons, instigator, setIsOpen, activateCtx
  })

  const handleOutside = (e) => {
    if (menuRef.current?.contains(e.target) || buttonRefs.current[instigatorKey]?.contains(e.target)) {
      return
    }
    setIsOpen(false)
  }

  const handleItemClick = (e, item) => {
    if (e.nativeEvent._fromKeyboardActivation || disabledButtons.has(item.id)) {
      return
    }
    setIsOpen(false)
    activateItem(e, item, activateCtx)
  }

  useEffect(() => {
    menuRef.current?.focus()
    if (startPos === 'first') {
      setIndex(visibleIndices[0] ?? -1)
    } else if (startPos === 'last') {
      setIndex(visibleIndices[visibleIndices.length - 1] ?? -1)
    } else {
      // No action
    }
    const handleResize = () => setIsOpen(false)
    document.addEventListener('focusin', handleOutside)
    document.addEventListener('pointerdown', handleOutside)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('focusin', handleOutside)
      document.removeEventListener('pointerdown', handleOutside)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const { style: menuStyle, direction: menuDirection, halign: menuHAlign } = getMenuStyle(buttonRect)
  return { index, handleMenuKeyDown, handleItemClick, menuStyle, menuDirection, menuHAlign }
}
