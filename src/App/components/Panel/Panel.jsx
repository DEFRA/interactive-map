import React, { useRef, useEffect, useMemo } from 'react'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'
import { stringToKebab } from '../../../utils/stringToKebab.js'
import { useModalPanelBehaviour } from '../../hooks/useModalPanelBehaviour.js'
import { useIsScrollable } from '../../hooks/useIsScrollable.js'
import { Icon } from '../Icon/Icon'

export const Panel = ({ panelId, panelConfig, props, WrappedChild, label, html, children }) => {
  const { id } = useConfig()
  const { dispatch, breakpoint, layoutRefs } = useApp()

  const rootEl = document.getElementById(`${id}-im-app`)
  const bpConfig = panelConfig[breakpoint]
  const elementId = `${id}-panel-${stringToKebab(panelId)}`

  const isAside = bpConfig.slot === 'side' && bpConfig.initiallyOpen && !bpConfig.modal
  const isDialog = !isAside && bpConfig.dismissable
  const isModal = bpConfig.modal === true
  const isDismissable = bpConfig.dismissable !== false
  const shouldFocus = Boolean(isModal || props?.triggeringElement)

  const buttonContainerEl = bpConfig.slot.endsWith('button') ? props?.triggeringElement?.parentNode : undefined
  const mainRef = layoutRefs.mainRef
  const panelRef = useRef(null)
  const bodyRef = useRef(null)
  const isBodyScrollable = useIsScrollable(bodyRef)

  const handleClose = () => {
    requestAnimationFrame(() => { (props?.triggeringElement || layoutRefs.viewportRef.current).focus?.() })
    dispatch({ type: 'CLOSE_PANEL', payload: panelId })
  }

  useModalPanelBehaviour({ mainRef, panelRef, isModal, isAside, rootEl, buttonContainerEl, handleClose })

  useEffect(() => {
    if (shouldFocus) {
      panelRef.current.focus()
    }
  }, [])

  const panelClass = [
    'im-c-panel',
    `im-c-panel--${bpConfig.slot}`,
    !panelConfig.showLabel && 'im-c-panel--no-heading'
  ].filter(Boolean).join(' ')

  const panelBodyClass = [
    'im-c-panel__body',
    !panelConfig.showLabel && isDismissable && 'im-c-panel__body--offset'
  ].filter(Boolean).join(' ')

  const innerHtmlProp = useMemo(() => html ? { __html: html } : null, [html])

  return (
    <div
      ref={panelRef}
      id={elementId}
      aria-labelledby={`${elementId}-label`}
      tabIndex={shouldFocus ? -1 : undefined}
      role={isDialog ? 'dialog' : isDismissable ? 'complementary' : 'region'}
      aria-modal={isDialog && isModal ? 'true' : undefined}
      style={bpConfig.width ? { width: bpConfig.width } : undefined}
      className={panelClass}
    >
      <h2
        id={`${elementId}-label`}
        className={panelConfig.showLabel ? 'im-c-panel__heading im-e-heading-m' : 'im-u-visually-hidden'}
      >
        {label}
      </h2>

      {isDismissable && (
        <button
          aria-label={`Close ${label}`}
          className='im-c-panel__close'
          onClick={handleClose}
        >
          <Icon id='close' />
        </button>
      )}

      {innerHtmlProp
        ? (
          <div
            ref={bodyRef}
            className={panelBodyClass}
            tabIndex={isBodyScrollable ? 0 : undefined}
            dangerouslySetInnerHTML={innerHtmlProp}
          />
          )
        : (
          <div
            ref={bodyRef}
            className={panelBodyClass}
            tabIndex={isBodyScrollable ? 0 : undefined}
            role={isBodyScrollable ? 'region' : undefined}
            aria-labelledby={isBodyScrollable ? `${elementId}-label` : undefined}
          >
            {WrappedChild ? <WrappedChild {...props} /> : children}
          </div>
          )}
    </div>
  )
}
