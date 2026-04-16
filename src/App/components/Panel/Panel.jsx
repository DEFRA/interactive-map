import React, { useRef, useEffect, useMemo } from 'react'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'
import { stringToKebab } from '../../../utils/stringToKebab.js'
import { useModalPanelBehaviour } from '../../hooks/useModalPanelBehaviour.js'
import { useIsScrollable } from '../../hooks/useIsScrollable.js'
import { Icon } from '../Icon/Icon'

const computePanelState = (bpConfig, triggeringElement, focus, focusOnOpen) => {
  const isAside = bpConfig.slot === 'side' && bpConfig.open && !bpConfig.modal
  const isDialog = !isAside && bpConfig.dismissible
  const isModal = bpConfig.modal === true
  const isDismissible = bpConfig.dismissible !== false
  const shouldFocus = isModal || (focusOnOpen !== false && (focusOnOpen === true || focus === true || Boolean(triggeringElement)))
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

const buildPanelProps = ({ elementId, shouldFocus, isDialog, isDismissible, isModal, width, panelClass, slot }) => ({
  id: elementId,
  'aria-labelledby': `${elementId}-label`,
  tabIndex: shouldFocus ? -1 : undefined, // nosonar
  role: getPanelRole(isDialog, isDismissible),
  'aria-modal': isDialog && isModal ? 'true' : undefined,
  style: width ? { width } : undefined,
  className: panelClass,
  'data-slot': slot
})

const buildBodyProps = ({ bodyRef, panelBodyClass, isBodyScrollable, elementId }) => ({
  ref: bodyRef,
  className: panelBodyClass,
  tabIndex: isBodyScrollable ? 0 : undefined, // nosonar
  role: isBodyScrollable ? 'region' : undefined,
  'aria-labelledby': isBodyScrollable ? `${elementId}-label` : undefined
})

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Panel = ({ panelId, panelConfig, props, focusOnOpen, WrappedChild, label, html, children, isOpen = true, rootRef }) => {
  const { id } = useConfig()
  const { dispatch, breakpoint, layoutRefs } = useApp()

  const rootEl = document.getElementById(`${id}-im-app`)
  const bpConfig = panelConfig[breakpoint]
  const elementId = `${id}-panel-${stringToKebab(panelId)}`

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
    requestAnimationFrame(() => { (props?.triggeringElement || layoutRefs.viewportRef.current).focus?.() })
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

  const panelProps = buildPanelProps({ elementId, shouldFocus, isDialog, isDismissible, isModal, width: bpConfig.width, panelClass, slot: bpConfig.slot })
  const bodyProps = buildBodyProps({ bodyRef, panelBodyClass, isBodyScrollable, elementId })

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
          aria-label={`Close ${label}`}
          className='im-c-panel__close'
          onClick={handleClose}
        >
          <Icon id='close' />
        </button>
      )}

      {innerHtmlProp
        ? <div {...bodyProps} dangerouslySetInnerHTML={innerHtmlProp} /> // nosonar
        : (
          <div {...bodyProps}> {/* nosonar */}
            {WrappedChild ? <WrappedChild {...props} /> : children}
          </div>
          )}
    </div>
  )
}
