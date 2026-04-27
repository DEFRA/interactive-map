import { useState, useMemo, useEffect } from 'react'
import { stringToKebab } from '../../../utils/stringToKebab.js'
import { useApp } from '../../store/appContext.js'

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
 * @param {React.SyntheticEvent} event - The triggering React event.
 * @param {object}               item  - The item being activated.
 * @param {object}               ctx   - Dependencies: { buttonConfig, evaluateProp, pluginId, id }.
 */
const activateItem = (event, item, { buttonConfig, evaluateProp, pluginId, id }) => {
  const menuItemConfig = buttonConfig[item.id]
  if (typeof menuItemConfig?.onClick === 'function') {
    menuItemConfig.onClick(event, evaluateProp(ctx => ctx, pluginId))
  } else if (typeof item.onClick === 'function') {
    item.onClick(event.nativeEvent)
  } else {
    // No action
  }
  if (event.nativeEvent instanceof KeyboardEvent) {
    const menuItemEl = document.getElementById(`${id}-${stringToKebab(item.id)}`)
    if (menuItemEl) {
      const click = new MouseEvent('click', { bubbles: true, cancelable: true })
      click._fromKeyboardActivation = true
      menuItemEl.dispatchEvent(click)
    }
  }
}

const resolveInitialIndex = (startIndex, startPos, visibleIndices) => {
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
}

const resolveItemFocus = (item, buttonConfig) => ({
  panelId: buttonConfig[item.id]?.panelId ?? item.panelId,
  keepFocus: buttonConfig[item.id]?.keepFocus ?? item.keepFocus
})

const handleMenuEnter = (event, { items, index, disabledButtons, activateCtx, instigator, dispatch, viewportRef, setIsOpen }) => {
  event.preventDefault()
  const item = items[index]
  if (item && !disabledButtons.has(item.id)) {
    const { panelId, keepFocus } = resolveItemFocus(item, activateCtx.buttonConfig)
    if (panelId) {
      dispatch({ type: 'OPEN_PANEL', payload: { panelId, props: { triggeringElement: instigator }, ...(keepFocus && { focusOnOpen: false }) } })
      setIsOpen(false)
      return
    }
    activateItem(event, item, activateCtx)
    if (keepFocus) {
      instigator.focus()
      setIsOpen(false)
      return
    }
  }
  requestAnimationFrame(() => viewportRef.current?.focus())
  setIsOpen(false)
}

const handleMenuSpace = (event, { items, index, disabledButtons, activateCtx, instigator, dispatch, viewportRef, setIsOpen }) => {
  event.preventDefault()
  const item = items[index]
  if (!item || disabledButtons.has(item.id)) {
    return
  }
  const { panelId, keepFocus } = resolveItemFocus(item, activateCtx.buttonConfig)
  if (panelId) {
    dispatch({ type: 'OPEN_PANEL', payload: { panelId, props: { triggeringElement: instigator }, ...(keepFocus && { focusOnOpen: false }) } })
    setIsOpen(false)
    return
  }
  activateItem(event, item, activateCtx)
  if (!(item.isPressed !== undefined || item.pressedWhen)) {
    if (keepFocus) {
      instigator.focus()
    } else {
      requestAnimationFrame(() => viewportRef.current?.focus())
    }
    setIsOpen(false)
  }
}

/**
 * Builds the keydown handler for the menu UL. Handles Escape/Tab (close & focus),
 * ArrowDown/Up (navigate visible items), Home/End (jump to ends),
 * Enter (activate and close), Space (activate; close only for non-checkbox items).
 *
 * @param {object}   params
 * @param {Array}    params.items           - All menu item descriptors.
 * @param {number[]} params.visibleIndices  - Indices of non-hidden items.
 * @param {number}   params.index           - Currently highlighted index.
 * @param {Function} params.setIndex        - State setter for highlighted index.
 * @param {Set}      params.disabledButtons - IDs of disabled items.
 * @param {object}   params.instigator      - DOM node of the trigger button.
 * @param {Function} params.setIsOpen       - Callback to close the menu.
 * @param {object}   params.activateCtx     - Context passed through to activateItem.
 * @param {Function} params.dispatch        - App dispatch for OPEN_PANEL actions.
 * @param {object}   params.viewportRef     - Ref to the map viewport element.
 * @returns {Function} onKeyDown handler for the menu element.
 */
const createMenuKeyDownHandler = ({ items, visibleIndices, index, setIndex, disabledButtons, instigator, setIsOpen, activateCtx, dispatch, viewportRef }) => {
  const closeAndFocus = (event, preventDefault = false) => {
    if (preventDefault && event?.preventDefault) {
      event.preventDefault()
    }
    instigator.focus()
    setIsOpen(false)
  }

  const navigateVisible = (event) => {
    event.preventDefault()
    const visibleCount = visibleIndices.length
    if (visibleCount === 0) {
      return
    }
    const pos = visibleIndices.indexOf(index)
    let nextPos
    if (event.key === 'ArrowDown') {
      nextPos = pos === -1 ? 0 : (pos + 1) % visibleCount
    } else if (pos === -1) {
      nextPos = visibleCount - 1
    } else {
      nextPos = (pos - 1 + visibleCount) % visibleCount
    }
    setIndex(visibleIndices[nextPos])
  }

  const actionCtx = { items, index, disabledButtons, activateCtx, instigator, dispatch, viewportRef, setIsOpen }

  return (event) => {
    if (['Escape', 'Esc'].includes(event.key)) {
      closeAndFocus(event, true)
      return
    }
    if (event.key === 'Tab') {
      closeAndFocus(event)
      return
    }
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      navigateVisible(event)
      return
    }
    if (event.key === 'Home' && visibleIndices.length) {
      setIndex(visibleIndices[0])
      return
    }
    if (event.key === 'End' && visibleIndices.length) {
      setIndex(visibleIndices[visibleIndices.length - 1])
      return
    }
    if (event.key === 'Enter') {
      handleMenuEnter(event, actionCtx)
    }
    if (event.key === ' ') {
      handleMenuSpace(event, actionCtx)
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
 * @param {object}   params.buttonConfig     - Config map that may override item onClick, panelId, and keepFocus.
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
  const { dispatch, layoutRefs } = useApp()
  const viewportRef = layoutRefs.viewportRef

  const visibleIndices = useMemo(() => {
    const visible = []
    items.forEach((item, idx) => {
      if (!hiddenButtons.has(item.id)) {
        visible.push(idx)
      }
    })
    return visible
  }, [items, hiddenButtons])

  const [index, setIndex] = useState(() => resolveInitialIndex(startIndex, startPos, visibleIndices))

  const activateCtx = { buttonConfig, evaluateProp, pluginId, id }

  const handleMenuKeyDown = createMenuKeyDownHandler({
    items, visibleIndices, index, setIndex, disabledButtons, instigator, setIsOpen, activateCtx, dispatch, viewportRef
  })

  const handleOutside = (event) => {
    if (menuRef.current?.contains(event.target) || buttonRefs.current[instigatorKey]?.contains(event.target)) {
      return
    }
    setIsOpen(false)
  }

  const handleItemClick = (event, item) => {
    if (event.nativeEvent._fromKeyboardActivation || disabledButtons.has(item.id)) {
      return
    }
    const { panelId, keepFocus } = resolveItemFocus(item, buttonConfig)
    if (panelId) {
      dispatch({ type: 'OPEN_PANEL', payload: { panelId, props: { triggeringElement: instigator }, ...(keepFocus && { focusOnOpen: false }) } })
      setIsOpen(false)
      return
    }
    setIsOpen(false)
    activateItem(event, item, activateCtx)
    if (keepFocus) {
      instigator.focus()
    } else {
      viewportRef.current?.focus()
    }
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
