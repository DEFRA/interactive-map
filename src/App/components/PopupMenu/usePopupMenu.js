import { useState, useMemo, useEffect } from 'react'
import { stringToKebab } from '../../../utils/stringToKebab.js'
import { findTabStop } from '../../../utils/findNextTabStop.js'
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

/**
 * Focuses the instigator button if it's still in the DOM, otherwise falls back
 * to the map viewport. The instigator can disappear while the menu is open
 * (e.g. app state changes elsewhere remove/disable the triggering button),
 * so callers must not assume it's still focusable.
 *
 * @param {HTMLElement|null} instigator - DOM node of the trigger button, may no longer exist.
 * @param {object}           viewportRef - Ref to the map viewport element, used as fallback.
 */
const focusInstigatorOrViewport = (instigator, viewportRef) => {
  if (instigator) {
    instigator.focus()
  } else {
    viewportRef.current?.focus()
  }
}

// A Panel rendered as a modal dialog (see Panel.jsx's computePanelState/getPanelRole)
// carries both of these attributes together and traps focus within itself via
// useModalPanelBehaviour's focusin redirect — tab-stop search must stay inside it.
const MODAL_DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"]'

/**
 * Moves focus to the tab stop immediately after (or before, for Shift+Tab)
 * the instigator button, continuing the page's natural tab sequence rather
 * than returning focus into the popup itself. The popup is rendered via a
 * portal elsewhere in the DOM, so the browser's own Tab default action can't
 * be relied on to continue from the instigator — it must be computed and
 * applied manually. The search is scoped to the nearest modal dialog ancestor
 * (if any): searching the whole document would let it pick a tab stop outside
 * an open modal panel, which the app's own modal focus-trap then immediately
 * yanks focus back from — landing on the trap's container div, which has no
 * visible focus styling, making focus appear to vanish. Falls back to
 * computing the tab stop from the menu element itself if the instigator is
 * gone, so focus still lands on a real neighbouring control rather than
 * jumping to an unrelated part of the app.
 *
 * @param {HTMLElement|null} instigator - DOM node of the trigger button, may no longer exist.
 * @param {boolean}          isShiftTab - Whether Shift+Tab (move backwards) was pressed.
 * @param {HTMLElement}      fallbackEl - Menu element to anchor from if the instigator is gone.
 */
const focusAdjacentTabStop = (instigator, isShiftTab, fallbackEl) => {
  const anchor = instigator ?? fallbackEl
  const root = anchor.closest?.(MODAL_DIALOG_SELECTOR) ?? document
  const nextStop = findTabStop({ el: anchor, direction: isShiftTab ? 'prev' : 'next', root })
  nextStop?.focus()
}

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
      focusInstigatorOrViewport(instigator, viewportRef)
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
      focusInstigatorOrViewport(instigator, viewportRef)
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
  const closeAndFocus = (event) => {
    event.preventDefault()
    focusInstigatorOrViewport(instigator, viewportRef)
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
      closeAndFocus(event)
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      focusAdjacentTabStop(instigator, event.shiftKey, event.currentTarget)
      setIsOpen(false)
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
      setIndex(visibleIndices[visibleIndices.length - 1]) // NOSONAR .length - 1 used instead of .at(-1) for wider browser support
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
      focusInstigatorOrViewport(instigator, viewportRef)
    } else {
      viewportRef.current?.focus()
    }
  }

  useEffect(() => {
    menuRef.current?.focus()
    if (startPos === 'first') {
      setIndex(visibleIndices[0] ?? -1)
    } else if (startPos === 'last') {
      setIndex(visibleIndices[visibleIndices.length - 1] ?? -1) // NOSONAR .length - 1 used instead of .at(-1) for wider browser support
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
