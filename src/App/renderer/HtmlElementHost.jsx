// src/App/renderer/HtmlElementHost.jsx
import React, { useRef, useEffect, useMemo } from 'react'
import { useApp } from '../store/appContext.js'
import { Panel } from '../components/Panel/Panel.jsx'
import { resolveTargetSlot, isModeAllowed, isControlVisible, isConsumerHtml } from './slotHelpers.js'
import { allowedSlots } from './slots.js'
import { stringToKebab } from '../../utils/stringToKebab.js'

/**
 * Maps slot names to their corresponding layout refs.
 */
export const getSlotRef = (slot, layoutRefs) => {
  const slotRefMap = {
    side: layoutRefs.sideRef,
    banner: layoutRefs.bannerRef,
    'top-left': layoutRefs.topLeftColRef,
    'top-right': layoutRefs.topRightColRef,
    inset: layoutRefs.insetRef,
    middle: layoutRefs.middleRef,
    bottom: layoutRefs.bottomRef,
    actions: layoutRefs.actionsRef,
    modal: layoutRefs.modalRef
  }
  return slotRefMap[slot] || null
}

/**
 * Manages DOM projection for a single persistent element.
 * Moves the wrapper into the target slot when visible, hides it otherwise.
 * Depends on breakpoint to handle conditionally rendered slot containers
 * (e.g. the banner slot swaps DOM nodes between mobile and desktop).
 */
export const useDomProjection = (wrapperRef, targetSlot, isVisible, layoutRefs, breakpoint) => {
  useEffect(() => {
    const wrapper = wrapperRef.current

    if (isVisible) {
      const slotRef = getSlotRef(targetSlot, layoutRefs)
      if (slotRef?.current) {
        slotRef.current.appendChild(wrapper)
        wrapper.style.display = ''
      }
    } else {
      wrapper.style.display = 'none'
    }

    return () => {
      wrapper.style.display = 'none'
    }
  }, [isVisible, targetSlot, layoutRefs, breakpoint, wrapperRef])
}

/**
 * Persistent wrapper for a consumer HTML panel.
 * The Panel component stays mounted for the lifetime of the registration.
 * DOM projection moves it between slots; CSS hides it when closed.
 */
const PersistentPanel = ({ panelId, config, isOpen, openPanelProps, allowedModalPanelId, appState }) => {
  const panelRootRef = useRef(null)
  const { breakpoint, mode, isFullscreen, layoutRefs } = appState

  const bpConfig = config[breakpoint]
  const targetSlot = bpConfig ? resolveTargetSlot(bpConfig, breakpoint) : null

  // Determine visibility using the same logic as mapPanels
  const isVisible = (() => {
    if (!isOpen || !bpConfig || !targetSlot) {
      return false
    }
    const isNextToButton = `${stringToKebab(panelId)}-button` === targetSlot
    if (!allowedSlots.panel.includes(targetSlot) && !isNextToButton) {
      return false
    }
    if (!isModeAllowed(config, mode)) {
      return false
    }
    if (config.inline === false && !isFullscreen) {
      return false
    }
    if (bpConfig.modal && panelId !== allowedModalPanelId) {
      return false
    }
    return true
  })()

  useDomProjection(panelRootRef, targetSlot, isVisible, layoutRefs, breakpoint)

  return (
    <Panel
      panelId={panelId}
      panelConfig={config}
      props={openPanelProps}
      html={config.html}
      label={config.label}
      isOpen={isOpen}
      rootRef={panelRootRef}
    />
  )
}

/**
 * Persistent wrapper for a consumer HTML control.
 * The control stays mounted for the lifetime of the registration.
 */
const PersistentControl = ({ control, appState }) => {
  const wrapperRef = useRef(null)
  const { breakpoint, mode, isFullscreen, layoutRefs } = appState

  const bpConfig = control[breakpoint]
  const isVisible = isControlVisible(control, { breakpoint, mode, isFullscreen })
  const targetSlot = bpConfig?.slot || null

  useDomProjection(wrapperRef, targetSlot, isVisible, layoutRefs, breakpoint)

  const innerHtml = useMemo(() => ({ __html: control.html }), [control.html])

  return (
    <div
      ref={wrapperRef}
      className='im-c-control'
      style={{ display: 'none' }}
      dangerouslySetInnerHTML={innerHtml}
    />
  )
}

/**
 * Renders all consumer HTML panels and controls persistently.
 * Items mount once on registration and only unmount on deregistration.
 * Visibility and slot placement are handled by DOM projection, not React mount/unmount.
 */
export const HtmlElementHost = () => {
  const appState = useApp()
  const { panelConfig = {}, controlConfig = {}, openPanels = {}, breakpoint } = appState

  // Find consumer HTML panels
  const htmlPanels = useMemo(() =>
    Object.entries(panelConfig).filter(([_, config]) => isConsumerHtml(config)),
  [panelConfig]
  )

  // Find consumer HTML controls
  const htmlControls = useMemo(() =>
    Object.values(controlConfig).filter(control => isConsumerHtml(control)),
  [controlConfig]
  )

  // Determine which modal panel is allowed (topmost open modal)
  const allowedModalPanelId = useMemo(() => {
    const openPanelEntries = Object.entries(openPanels)
    const modalPanels = openPanelEntries.filter(([panelId]) => {
      const cfg = panelConfig[panelId]?.[breakpoint]
      return cfg?.modal
    })
    return modalPanels.length > 0 ? modalPanels[modalPanels.length - 1][0] : null
  }, [openPanels, panelConfig, breakpoint])

  if (!htmlPanels.length && !htmlControls.length) {
    return null
  }

  return (
    <>
      {htmlPanels.map(([panelId, config]) => (
        <PersistentPanel
          key={panelId}
          panelId={panelId}
          config={config}
          isOpen={!!openPanels[panelId]}
          openPanelProps={openPanels[panelId]?.props}
          allowedModalPanelId={allowedModalPanelId}
          appState={appState}
        />
      ))}
      {htmlControls.map(control => (
        <PersistentControl
          key={control.id}
          control={control}
          appState={appState}
        />
      ))}
    </>
  )
}
