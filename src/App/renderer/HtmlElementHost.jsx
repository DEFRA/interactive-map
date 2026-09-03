// src/App/renderer/HtmlElementHost.jsx
import React, { useRef, useLayoutEffect, useMemo } from 'react'
import { useApp } from '../store/appContext.js'
import { Panel } from '../components/Panel/Panel.jsx'
import { resolveTargetSlot, isControlVisible, isConsumerHtml, isPanelSlotEligible, getAllowedModalPanelId } from './slotHelpers.js'

/**
 * Maps slot names to their corresponding layout refs.
 */
export const getSlotRef = (slot, layoutRefs) => {
  const slotRefMap = {
    side: layoutRefs.sideRef,
    banner: layoutRefs.bannerRef,
    'top-left': layoutRefs.topLeftColRef,
    'top-right': layoutRefs.topRightColRef,
    'left-top': layoutRefs.leftTopRef,
    'left-bottom': layoutRefs.leftBottomRef,
    middle: layoutRefs.middleRef,
    'right-top': layoutRefs.rightTopRef,
    'right-bottom': layoutRefs.rightBottomRef,
    'bottom-right': layoutRefs.bottomRightRef,
    drawer: layoutRefs.drawerRef,
    actions: layoutRefs.actionsRef,
    modal: layoutRefs.modalRef
  }
  if (slot?.endsWith('-button')) {
    const el = document.querySelector(`[data-button-slot="${slot}"]`)
    return el ? { current: el } : null
  }
  if (slot?.endsWith('-panel')) {
    const el = document.querySelector(`[data-panel-slot="${slot}"]`)
    return el ? { current: el } : null
  }

  return slotRefMap[slot] || null
}

/**
 * Manages DOM projection for a single persistent element.
 * Moves the wrapper into the target slot when visible, hides it otherwise.
 * Depends on breakpoint to handle conditionally rendered slot containers
 * (e.g. the banner slot swaps DOM nodes between mobile and desktop).
 *
 * `anchorKey` is an optional extra dependency for anchors that aren't always present in the
 * DOM — e.g. a `-panel` target only exists while that panel is open — so the projection is
 * re-attempted whenever it changes, rather than only on mount. Stable/persistent anchors
 * (named layout slots, `-button` targets) don't need it since they never come and go.
 */
export const useDomProjection = (wrapperRef, targetSlot, isVisible, layoutRefs, breakpoint, anchorKey) => {
  const layoutRefsRef = useRef(layoutRefs)
  layoutRefsRef.current = layoutRefs

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current

    if (isVisible) {
      const slotRef = getSlotRef(targetSlot, layoutRefsRef.current)
      if (slotRef?.current) {
        const backdrop = slotRef.current.querySelector(':scope > .im-o-app__modal-backdrop')
        if (backdrop) {
          slotRef.current.insertBefore(wrapper, backdrop)
        } else {
          slotRef.current.appendChild(wrapper)
        }
        wrapper.style.display = ''
      }
    } else {
      if (wrapper.parentElement === layoutRefsRef.current.modalRef?.current) {
        layoutRefsRef.current.appContainerRef?.current?.appendChild(wrapper)
      }
      wrapper.style.display = 'none'
    }

    return () => {
      wrapper.style.display = 'none'
    }
  }, [isVisible, targetSlot, breakpoint, wrapperRef, anchorKey])
}

/**
 * Persistent wrapper for a consumer HTML panel.
 * The Panel component stays mounted for the lifetime of the registration.
 * DOM projection moves it between slots; CSS hides it when closed.
 */
const PersistentPanel = ({ panelId, config, isOpen, openPanelProps, focusOnOpen, allowedModalPanelId, appState }) => {
  const panelRootRef = useRef(null)
  const { breakpoint, mode, isFullscreen, layoutRefs } = appState

  const bpConfig = config[breakpoint]
  const targetSlot = bpConfig ? resolveTargetSlot(bpConfig, breakpoint) : null

  // Same eligibility/modal-exclusivity rules as mapPanels.js (see slotHelpers.js), combined into
  // one boolean since isVisible alone decides whether useDomProjection shows it.
  const isVisible = Boolean(
    isOpen && bpConfig && targetSlot &&
    isPanelSlotEligible(config, { targetSlot, mode, isFullscreen }) &&
    (!bpConfig.modal || panelId === allowedModalPanelId)
  )

  useDomProjection(panelRootRef, targetSlot, isVisible, layoutRefs, breakpoint)

  return (
    <Panel
      panelId={panelId}
      panelConfig={config}
      props={openPanelProps}
      focusOnOpen={focusOnOpen}
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
  const { breakpoint, mode, isFullscreen, layoutRefs, openPanels } = appState

  const bpConfig = control[breakpoint]
  const isVisible = isControlVisible(control, { breakpoint, mode, isFullscreen })
  const targetSlot = bpConfig?.slot || null

  // A control targeting a panel's body (`<panelId>-panel`) needs its DOM anchor re-resolved
  // whenever panels open/close, since that anchor only exists while the target panel is open.
  const anchorKey = targetSlot?.endsWith('-panel') ? Object.keys(openPanels || {}).sort((a, b) => a.localeCompare(b)).join(',') : null

  useDomProjection(wrapperRef, targetSlot, isVisible, layoutRefs, breakpoint, anchorKey)

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
  const allowedModalPanelId = useMemo(
    () => getAllowedModalPanelId(openPanels, panelConfig, breakpoint),
    [openPanels, panelConfig, breakpoint]
  )

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
          focusOnOpen={openPanels[panelId]?.focusOnOpen}
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
