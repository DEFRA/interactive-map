import { useEffect } from 'react'
import { useResizeObserver } from './useResizeObserver.js'
import { constrainKeyboardFocus } from '../../utils/constrainKeyboardFocus.js'
import { toggleInertElements } from '../../utils/toggleInertElements.js'
import { useApp } from '../store/appContext.js'

// Left/right slots reuse the layout CSS vars set by useLayoutMeasurements — no DOM measurement needed.
// CSS var references resolve correctly at the panel element (inside .im-o-app) even though
// --modal-inset is set on :root.
const SLOT_MODAL_VARS = {
  'left-top': { inset: 'var(--left-offset-top) auto auto var(--primary-gap)', maxHeight: 'var(--left-top-max-height)' },
  'left-bottom': { inset: 'auto auto var(--left-offset-bottom) var(--primary-gap)', maxHeight: 'var(--left-top-max-height)' },
  'right-top': { inset: 'var(--right-offset-top) var(--primary-gap) auto auto', maxHeight: 'var(--right-top-max-height)' },
  'right-bottom': { inset: 'auto var(--primary-gap) var(--right-offset-bottom) auto', maxHeight: 'var(--right-top-max-height)' }
}

const MODAL_INSET = '--modal-inset'
const MODAL_MAX_HEIGHT = '--modal-max-height'

const setButtonCSSVar = (effectiveContainer, mainRef, dividerGap) => {
  const root = document.documentElement
  const mainRect = mainRef.current.getBoundingClientRect()
  const buttonRect = effectiveContainer.getBoundingClientRect()
  const isBottomSlot = !!effectiveContainer.closest('.im-o-app__left-bottom, .im-o-app__right-bottom')
  const isLeftSlot = !!effectiveContainer.closest('.im-o-app__left-top, .im-o-app__left-bottom')

  const insetTop = isBottomSlot ? 'auto' : `${Math.round(buttonRect.top - mainRect.top)}px`
  const insetBottom = isBottomSlot ? `${Math.round(mainRect.bottom - buttonRect.bottom)}px` : 'auto'
  const insetRight = isLeftSlot ? 'auto' : `${Math.round(mainRect.right - buttonRect.left + dividerGap)}px`
  const insetLeft = isLeftSlot ? `${Math.round(buttonRect.right - mainRect.left + dividerGap)}px` : 'auto'
  const anchor = isBottomSlot ? Math.round(mainRect.bottom - buttonRect.bottom) : Math.round(buttonRect.top - mainRect.top)

  root.style.setProperty(MODAL_INSET, `${insetTop} ${insetRight} ${insetBottom} ${insetLeft}`)
  root.style.setProperty(MODAL_MAX_HEIGHT, `${mainRect.height - anchor - dividerGap}px`)
}

const setSlotCSSVar = (slot, layoutRefs, primaryMargin) => {
  const root = document.documentElement

  // Left/right slots: delegate entirely to existing layout CSS vars
  const mapped = SLOT_MODAL_VARS[slot]
  if (mapped) {
    root.style.setProperty(MODAL_INSET, mapped.inset)
    root.style.setProperty(MODAL_MAX_HEIGHT, mapped.maxHeight)
    return
  }

  // Other slots (e.g. inset): measure position from DOM
  const refKey = `${slot[0].toLowerCase() + slot.slice(1)}Ref` // single-part slots only
  const slotRef = layoutRefs[refKey]?.current
  const mainContainer = layoutRefs.mainRef?.current
  if (!slotRef || !mainContainer) {
    return
  }

  const slotRect = slotRef.getBoundingClientRect()
  const mainRect = mainContainer.getBoundingClientRect()
  const relLeft = slotRect.left - mainRect.left
  const relTop = slotRect.top - mainRect.top

  root.style.setProperty(MODAL_INSET, `${relTop}px auto auto ${relLeft}px`)
  root.style.setProperty(MODAL_MAX_HEIGHT, `${mainRect.height - relTop - primaryMargin}px`)
}

const useModalKeyHandler = (panelRef, isModal, handleClose) => {
  useEffect(() => {
    if (!isModal) {
      return undefined
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        handleClose()
      }

      if (e.key === 'Tab' && panelRef.current) {
        constrainKeyboardFocus(panelRef.current, e)
      }
    }

    const current = panelRef.current
    current?.addEventListener('keydown', handleKeyDown)

    return () => {
      current?.removeEventListener('keydown', handleKeyDown)
    }
  }, [isModal, panelRef, handleClose])
}

const useFocusRedirect = (isModal, panelRef, rootEl) => {
  useEffect(() => {
    if (!isModal) {
      return undefined
    }

    const handleFocusIn = (e) => {
      const focusedEl = e.target
      const panelEl = panelRef.current

      if (!focusedEl || !panelEl || !rootEl) {
        return
      }

      const isInsideApp = rootEl.contains(focusedEl)
      const isInsidePanel = panelEl.contains(focusedEl)

      if (isInsideApp && !isInsidePanel) {
        panelEl.focus()
      }
    }

    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
    }
  }, [isModal, panelRef, rootEl])
}

export function useModalPanelBehaviour ({
  mainRef,
  panelRef,
  isModal,
  rootEl,
  buttonContainerEl,
  handleClose
}) {
  const { layoutRefs } = useApp()

  useModalKeyHandler(panelRef, isModal, handleClose)

  // === Set --modal-inset and --modal-max-height, recalculate on mainRef resize === //
  useResizeObserver([mainRef], () => {
    if (!isModal || !mainRef.current) {
      return
    }

    const root = document.documentElement
    const styles = getComputedStyle(root)
    const dividerGap = Number.parseInt(styles.getPropertyValue('--divider-gap'), 10)
    const primaryMargin = Number.parseInt(styles.getPropertyValue('--primary-gap'), 10)
    const slot = panelRef.current.dataset.slot

    // Button-adjacent panels: position next to the controlling button.
    // Use slot name (not buttonContainerEl) as the gate — buttonContainerEl may be undefined
    // when there is no triggeringElement (e.g. panel opened programmatically).
    // Dynamically query via aria-controls to handle stale triggeringElement after breakpoint changes.
    if (slot?.endsWith('-button')) {
      const panelElId = panelRef.current?.id
      const currentButtonEl = panelElId ? document.querySelector(`[aria-controls="${panelElId}"]`) : null
      const effectiveContainer = currentButtonEl?.parentElement ??
        (buttonContainerEl?.isConnected ? buttonContainerEl : null) ??
        document.querySelector(`[data-button-slot="${slot}"]`)

      if (!effectiveContainer) {
        return
      }

      setButtonCSSVar(effectiveContainer, mainRef, dividerGap)
      return
    }

    // Slot-based panels: derive position from the slot container element
    setSlotCSSVar(slot, layoutRefs, primaryMargin)
  })

  // === Click on modal backdrop to close === //
  useEffect(() => {
    if (!isModal) {
      return undefined
    }

    const handleClick = (e) => {
      const backdropEl = e.target.closest('.im-o-app__modal-backdrop')
      if (rootEl && backdropEl && rootEl.contains(backdropEl)) {
        handleClose()
      }
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [isModal, rootEl, handleClose])

  // === Inert everything outside the panel but within the app === //
  useEffect(() => {
    if (!isModal || !panelRef.current || !rootEl) {
      return undefined
    }

    toggleInertElements({
      containerEl: panelRef.current,
      isFullscreen: true, // Treat modal as fullscreen
      boundaryEl: rootEl
    })

    return () => {
      toggleInertElements({
        containerEl: panelRef.current,
        isFullscreen: false,
        boundaryEl: rootEl
      })
    }
  }, [isModal, panelRef, rootEl])

  useFocusRedirect(isModal, panelRef, rootEl)
}
