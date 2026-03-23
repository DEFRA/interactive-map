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
 * Custom hook encapsulating all state and event-handler logic for PopupMenu.
 *
 * @param {object} params
 * @param {Array}  params.items            - Menu item descriptors.
 * @param {Set}    params.hiddenButtons     - IDs of items that should not be visible.
 * @param {number} [params.startIndex]     - Exact index to select on mount; takes precedence over startPos.
 * @param {string} [params.startPos]       - 'first' | 'last' — initial selection strategy when startIndex is absent.
 * @param {object} params.instigator       - DOM ref of the button that opened the menu; receives focus on close.
 * @param {string} params.instigatorKey    - Key used to look up instigator in buttonRefs.
 * @param {object} params.buttonRefs       - Ref map of all registered button DOM nodes.
 * @param {object} params.buttonConfig     - Config map that may override item onClick handlers.
 * @param {Set}    params.disabledButtons  - IDs of items that are currently disabled.
 * @param {string} params.pluginId         - Plugin context passed to evaluateProp.
 * @param {Function} params.evaluateProp   - Context evaluator from useEvaluateProp.
 * @param {string} params.id               - App-level ID prefix used for DOM element IDs.
 * @param {object} params.menuRef          - Ref to the menu UL element.
 * @param {Function} params.setIsOpen      - Callback to open/close the menu.
 * @param {DOMRect|null} params.buttonRect - Bounding rect of the trigger button for positioning.
 * @returns {{ index: number, handleMenuKeyDown: Function, handleItemClick: Function,
 *             menuStyle: object, menuDirection: string, menuHAlign: string }}
 */
export const usePopupMenu = ({
  items, hiddenButtons, startIndex, startPos, instigator, instigatorKey,
  buttonRefs, buttonConfig, disabledButtons, pluginId, evaluateProp, id, menuRef, setIsOpen, buttonRect
}) => {
  /**
   * Indices of items that are not in hiddenButtons.
   * Used by keyboard navigation to skip over hidden items.
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
   * Currently highlighted item index (-1 means no selection).
   * Initialised from startIndex, or from startPos ('first'/'last'), or -1.
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
   * Closes the menu and returns keyboard focus to the instigator button.
   *
   * @param {Event}   e              - The triggering event.
   * @param {boolean} [preventDefault=false] - Whether to call e.preventDefault().
   */
  const closeAndFocus = (e, preventDefault = false) => {
    if (preventDefault && e?.preventDefault) {
      e.preventDefault()
    }
    instigator.focus()
    setIsOpen(false)
  }

  /**
   * Moves selection up or down through visible items, wrapping at each end.
   * ArrowDown with no current selection jumps to the first visible item;
   * ArrowUp with no selection jumps to the last.
   *
   * @param {KeyboardEvent} e - The ArrowDown or ArrowUp keydown event.
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
   * Invokes an item's action via buttonConfig.onClick (if configured) or item.onClick.
   * For keyboard-triggered activations also dispatches a synthetic MouseEvent so that
   * any window-level click listeners (e.g. editVertexMode) fire as expected.
   * The synthetic event is marked with _fromKeyboardActivation so handleItemClick
   * can ignore it and avoid double-activation.
   *
   * @param {React.SyntheticEvent} e    - The triggering React event.
   * @param {object}               item - The item being activated.
   */
  const activateItem = (e, item) => {
    const menuItemConfig = buttonConfig[item.id]
    if (typeof menuItemConfig?.onClick === 'function') {
      menuItemConfig.onClick(e, evaluateProp(ctx => ctx, pluginId))
    } else if (typeof item.onClick === 'function') {
      item.onClick(e.nativeEvent)
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
   * Handles the Enter key: activates the selected item (if enabled), then closes
   * the menu and returns focus to the instigator.
   *
   * @param {KeyboardEvent} e - The Enter keydown event.
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
   * Handles the Space key. For checkbox items (pressedWhen / isPressed) the menu
   * stays open after activation. For regular items the menu closes and focus returns
   * to the instigator.
   *
   * @param {KeyboardEvent} e - The Space keydown event.
   */
  const handleSpace = (e) => {
    e.preventDefault()
    const item = items[index]
    if (!item || disabledButtons.has(item.id)) {
      return
    }
    activateItem(e, item)
    if (!(item.isPressed !== undefined || item.pressedWhen)) {
      instigator.focus()
      setIsOpen(false)
    }
  }

  /**
   * Top-level keydown handler attached to the menu UL.
   * Dispatches Escape/Tab → close, Arrow keys → navigate, Home/End → jump,
   * Enter/Space → activate.
   *
   * @param {KeyboardEvent} e - Keydown event from the menu element.
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
   * Closes the menu when a click or focus event originates outside both the menu
   * and the instigator button. Registered on document focusin and pointerdown.
   *
   * @param {Event} e - The focusin or pointerdown event.
   */
  const handleOutside = (e) => {
    if (menuRef.current?.contains(e.target) || buttonRefs.current[instigatorKey]?.contains(e.target)) {
      return
    }
    setIsOpen(false)
  }

  /**
   * Click handler for individual menu items. Ignores synthetic keyboard-activation
   * clicks (already handled by activateItem) and disabled items.
   *
   * @param {React.MouseEvent} e    - React synthetic click event from the LI.
   * @param {object}           item - The clicked item descriptor.
   */
  const handleItemClick = (e, item) => {
    if (e.nativeEvent._fromKeyboardActivation || disabledButtons.has(item.id)) {
      return
    }
    setIsOpen(false)
    activateItem(e, item)
  }

  /**
   * On mount: focuses the menu, syncs selection to startPos if provided, and
   * registers outside-click/focus and resize listeners.
   * Cleans up all listeners on unmount.
   */
  useEffect(() => {
    menuRef.current?.focus()
    if (startPos === 'first') {
      setIndex(visibleIndices[0] ?? -1)
    } else if (startPos === 'last') {
      setIndex(visibleIndices[visibleIndices.length - 1] ?? -1)
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
