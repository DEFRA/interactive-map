import React, { useRef, useEffect, useMemo } from 'react'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'
import { stringToKebab } from '../../../utils/stringToKebab.js'
import { getPanelElementId } from '../../../utils/getPanelElementId.js'
import { useModalPanelBehaviour } from '../../hooks/useModalPanelBehaviour.js'
import { useIsScrollable } from '../../hooks/useIsScrollable.js'
import { Icon } from '../Icon/Icon'
import { Tabs } from '../Tabs/Tabs.jsx'

// WCAG requires a modal to always be dismissible, so modal:true forces it regardless of config.
const resolveIsDismissible = (bpConfig, isModal) => isModal || bpConfig.dismissible !== false

const computePanelState = (bpConfig, triggeringElement, focus, focusOnOpen) => {
  const isModal = bpConfig.modal === true
  const isAside = bpConfig.slot === 'side' && bpConfig.open && !isModal
  const isDismissible = resolveIsDismissible(bpConfig, isModal)
  const isDialog = !isAside && isDismissible
  const shouldFocus = isModal || focusOnOpen === true || (focusOnOpen !== false && focus !== false && (focus === true || Boolean(triggeringElement)))
  const buttonContainerEl = bpConfig.slot.endsWith('button') ? triggeringElement?.parentNode : undefined
  return { isAside, isDialog, isModal, isDismissible, shouldFocus, buttonContainerEl }
}

const getPanelRole = (isDialog, isDismissible) => {
  if (isDialog) {
    return 'dialog'
  }
  if (isDismissible) {
    return 'complementary'
  }
  return 'region'
}

const buildPanelClassNames = (slot, showLabel) => [
  'im-c-panel',
  `im-c-panel--${slot}`,
  !showLabel && 'im-c-panel--no-heading'
].filter(Boolean).join(' ')

const buildPanelBodyClassNames = (showLabel, isDismissible) => [
  'im-c-panel__body',
  !showLabel && isDismissible && 'im-c-panel__body--offset'
].filter(Boolean).join(' ')

const buildPanelProps = ({ elementId, shouldFocus, isDialog, isDismissible, isModal, width, panelClass, slot, isOpen }) => ({
  id: elementId,
  'aria-labelledby': `${elementId}-label`,
  tabIndex: shouldFocus ? -1 : undefined, // nosonar
  role: getPanelRole(isDialog, isDismissible),
  'aria-modal': isDialog && isModal ? 'true' : undefined,
  style: width ? { width } : undefined,
  className: panelClass,
  'data-slot': slot,
  // Panel is mounted permanently (see mapPanels.js); hidden is what actually opens/closes it.
  hidden: !isOpen
})

const buildBodyProps = ({ bodyRef, panelBodyClass, isBodyScrollable, elementId }) => ({
  ref: bodyRef,
  className: panelBodyClass,
  tabIndex: isBodyScrollable ? 0 : undefined, // nosonar
  role: isBodyScrollable ? 'region' : undefined,
  'aria-labelledby': isBodyScrollable ? `${elementId}-label` : undefined
})

// Renders the panel body's content: an ordered list of items (own content plus any
// controls injected via the `<panelId>-panel` slot convention), or the legacy single
// WrappedChild/children shape for callers that don't build an items list (e.g. HtmlElementHost).
// Tabbed content is handled separately by Panel itself — see the tabs handling below — since
// the tablist needs to render outside this component's scrollable body, not inside it.
const BodyContent = ({ items, WrappedChild, props, children }) => { // NOSONAR
  if (items) {
    return items.map(item => <React.Fragment key={item.id}>{item.element}</React.Fragment>)
  }
  return WrappedChild ? <WrappedChild {...props} /> : children
}

// Chooses between the three body shapes: static html, tabbed, or the flat BodyContent above.
// .im-c-panel__body (bodyProps) always wraps everything, completely unchanged — same padding/
// overflow/box role it's always had, which is also what the tablist and tabpanel need to pick
// up their own inset from by simply being nested inside it. Only the scrollable-region
// behaviour (ref/tabIndex/role/aria-labelledby) moves down onto <Tabs>' own tabpanel div via
// panelProps when tabbed, since that's the part that should actually scroll/receive focus —
// the tablist (rendered by <Tabs> itself, ahead of the tabpanel) stays outside that inner
// scroll boundary so it can't scroll away with long tab content. The tabpanel's own focus ring
// clearance (so it isn't flush against its content) is a CSS-only concern — see
// Panel.module.scss's .im-c-tabs__panel override.
const PanelBody = ({ innerHtmlProp, tabs, items, WrappedChild, props, children, bodyProps, panelBodySlot }) => { // NOSONAR
  if (innerHtmlProp) {
    return <div {...bodyProps} dangerouslySetInnerHTML={innerHtmlProp} /> // nosonar
  }
  const { className, ...scrollableProps } = bodyProps
  if (tabs) {
    return (
      <div className={className} data-panel-slot={panelBodySlot}>
        <Tabs
          tabs={tabs.map(tab => ({
            name: tab.name,
            content: tab.items.map(item => <React.Fragment key={item.id}>{item.element}</React.Fragment>)
          }))}
          panelProps={scrollableProps}
        />
      </div>
    )
  }
  return (
    <div {...bodyProps} data-panel-slot={panelBodySlot}> {/* nosonar */}
      <BodyContent items={items} WrappedChild={WrappedChild} props={props}>{children}</BodyContent>
    </div>
  )
}

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Panel = ({ panelId, panelConfig, props, focusOnOpen, WrappedChild, items, tabs, label, html, children, isOpen = true, rootRef }) => {
  const { id } = useConfig()
  const { dispatch, breakpoint, layoutRefs, interfaceType } = useApp()

  const rootEl = document.getElementById(`${id}-im-app`)
  const bpConfig = panelConfig[breakpoint]
  const elementId = getPanelElementId(id, panelId)

  const { isAside, isDialog, isModal, isDismissible, shouldFocus, buttonContainerEl } = computePanelState(bpConfig, props?.triggeringElement, panelConfig.focus, focusOnOpen) // nosonar

  // For persistent panels, gate modal behaviour on open state
  const isModalActive = isModal && isOpen

  const mainRef = layoutRefs.mainRef
  const internalPanelRef = useRef(null)
  const bodyRef = useRef(null)
  const prevIsOpenRef = useRef(isOpen)
  const isBodyScrollable = useIsScrollable(bodyRef)

  // Merge internal ref with optional external rootRef
  const panelRef = rootRef || internalPanelRef

  const handleClose = () => {
    requestAnimationFrame(() => { (props?.triggeringElement || layoutRefs.viewportRef.current).focus?.({ preventScroll: interfaceType !== 'keyboard' }) })
    dispatch({ type: 'CLOSE_PANEL', payload: panelId })
  }

  useModalPanelBehaviour({ mainRef, panelRef, isModal: isModalActive, isAside, rootEl, buttonContainerEl, handleClose })

  useEffect(() => {
    // Focus on initial mount (non-persistent) or when isOpen transitions to true (persistent)
    const justOpened = isOpen && !prevIsOpenRef.current
    prevIsOpenRef.current = isOpen

    if (shouldFocus && (justOpened || isOpen)) {
      panelRef.current?.focus()
    }
  }, [isOpen])

  const panelClass = buildPanelClassNames(bpConfig.slot, bpConfig.showLabel ?? true)
  const panelBodyClass = buildPanelBodyClassNames(bpConfig.showLabel ?? true, isDismissible)
  const innerHtmlProp = useMemo(() => html ? { __html: html } : null, [html])

  const panelProps = buildPanelProps({ elementId, shouldFocus, isDialog, isDismissible, isModal, width: bpConfig.width, panelClass, slot: bpConfig.slot, isOpen })
  const bodyProps = buildBodyProps({ bodyRef, panelBodyClass, isBodyScrollable, elementId })
  // DOM anchor for controls DOM-projected via the JS/consumer-HTML API — see HtmlElementHost.jsx.
  // Only present on the items-capable body below: dangerouslySetInnerHTML owns the static-html
  // body's children, so it can't also host controls injected via the panel-slot convention.
  const panelBodySlot = `${stringToKebab(panelId)}-panel`

  return (
    <div // nosonar
      ref={panelRef}
      {...panelProps}
    >
      <h2
        id={`${elementId}-label`}
        className={(bpConfig.showLabel ?? true) ? 'im-c-panel__heading im-e-heading-m' : 'im-u-visually-hidden'}
      >
        {label}
      </h2>

      {isDismissible && (
        <button
          type='button'
          aria-label={`Close ${label}`}
          className='im-c-panel__close'
          onClick={handleClose}
        >
          <Icon id='close' />
        </button>
      )}

      <PanelBody
        innerHtmlProp={innerHtmlProp}
        tabs={tabs}
        items={items}
        WrappedChild={WrappedChild}
        props={props}
        bodyProps={bodyProps}
        panelBodySlot={panelBodySlot}
      >
        {children}
      </PanelBody>
    </div>
  )
}
