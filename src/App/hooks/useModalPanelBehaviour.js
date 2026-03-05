import { useEffect } from 'react'
import { useResizeObserver } from './useResizeObserver.js'
import { constrainKeyboardFocus } from '../../utils/constrainKeyboardFocus.js'
import { toggleInertElements } from '../../utils/toggleInertElements.js'

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
  useModalKeyHandler(panelRef, isModal, handleClose)

  // === Set absolute offset positions and recalculate on mainRef resize === //
  const root = document.documentElement
  const dividerGap = Number.parseInt(getComputedStyle(root).getPropertyValue('--divider-gap'), 10)

  useResizeObserver([mainRef], () => {
    if (!isModal || !mainRef.current) {
      return
    }

    // buttonContainerEl is only defined for button-slot panels (bpConfig.slot ends with '-button').
    // Skip positioning for all other modal types.
    if (buttonContainerEl === undefined) {
      return
    }

    // Dynamically query the current controlling button via aria-controls to handle the case
    // where the button has remounted after a breakpoint change (stale triggeringElement).
    const panelElId = panelRef.current?.id
    const currentButtonEl = panelElId ? document.querySelector(`[aria-controls="${panelElId}"]`) : null
    const effectiveContainer = currentButtonEl?.parentElement ?? (buttonContainerEl?.isConnected ? buttonContainerEl : null)

    if (!effectiveContainer) {
      return
    }

    const mainRect = mainRef.current.getBoundingClientRect()
    const buttonRect = effectiveContainer.getBoundingClientRect()
    const offsetTop = buttonRect.top - mainRect.top
    const offsetRight = Math.round(mainRect.right - buttonRect.right + buttonRect.width + dividerGap)
    root.style.setProperty('--modal-inset', `${offsetTop}px ${offsetRight}px auto auto`)
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
