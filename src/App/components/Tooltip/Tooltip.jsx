import React, { useRef, useState, useEffect, cloneElement } from 'react'
import { useApp } from '../../store/appContext'
import { getTooltipPosition } from './getTooltipPosition.js'

let tooltipIdCounter = 0
const showDelay = 500
const hideDelay = 0

// The label names the trigger (aria-labelledby) and the description describes it (aria-describedby).
// With both, they're shown together, each in its own element so neither is read twice.
const TooltipText = ({ tooltipId, label, description }) => (
  <>
    {label && <span id={`${tooltipId}-label`}>{label}</span>}
    {label && description && ': '}
    {description && <span id={`${tooltipId}-description`}>{description}</span>}
  </>
)

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Tooltip = ({ children, label, description }) => {
  const { interfaceType } = useApp()
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [focused, setFocused] = useState(false)
  const [position, setPosition] = useState(null)
  const [tooltipId] = useState(() => {
    tooltipIdCounter += 1
    return `tooltip-${tooltipIdCounter}`
  })

  const showTimeout = useRef(null)
  const hideTimeout = useRef(null)

  const cancel = () => {
    clearTimeout(showTimeout.current)
    setVisible(false)
  }

  const show = () => {
    clearTimeout(hideTimeout.current)
    showTimeout.current = setTimeout(() => setVisible(true), showDelay)
  }

  const hide = () => {
    clearTimeout(showTimeout.current)
    hideTimeout.current = setTimeout(() => setVisible(false), hideDelay)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearTimeout(showTimeout.current)
        clearTimeout(hideTimeout.current)
        setVisible(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    if (visible) {
      const pos = getTooltipPosition(triggerRef.current)
      setPosition(pos)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(showTimeout.current)
      clearTimeout(hideTimeout.current)
    }
  }, [visible])

  // Merge refs - call both the Tooltip's internal ref and any ref passed from the child
  const mergeRefs = (node) => {
    triggerRef.current = node

    // In React 19, ref is a regular prop
    const childRef = children.props?.ref
    if (typeof childRef === 'function') {
      childRef(node)
    } else if (childRef && typeof childRef === 'object') {
      childRef.current = node
    } else {
      // No action
    }
  }

  // Runs the trigger's own handler after the tooltip's, so the trigger keeps its own behaviour
  // (such as a menu button's keyboard handling)
  const withChildHandler = (name, handler) => (event) => {
    handler()
    children.props?.[name]?.(event)
  }

  const childWithProps = cloneElement(children, {
    ref: mergeRefs,
    onMouseEnter: withChildHandler('onMouseEnter', show),
    onMouseLeave: withChildHandler('onMouseLeave', hide),
    onMouseDown: withChildHandler('onMouseDown', cancel),
    onKeyDown: withChildHandler('onKeyDown', cancel),
    onFocus: withChildHandler('onFocus', () => {
      if (interfaceType === 'keyboard') {
        show()
      }
      setFocused(true)
    }),
    onBlur: withChildHandler('onBlur', () => {
      hide()
      setFocused(false)
    }),
    'aria-labelledby': label ? `${tooltipId}-label` : undefined,
    'aria-describedby': description ? `${tooltipId}-description` : undefined
  })

  return (
    <div className={`im-c-tooltip-wrapper${focused ? ' im-c-tooltip-wrapper--has-focus' : ''}`}>
      {childWithProps}
      <div
        id={tooltipId}
        ref={tooltipRef}
        className={`im-c-tooltip im-c-tooltip--${position || 'hidden'} ${visible ? 'im-c-tooltip--is-visible' : ''}`}
        role='tooltip'
        aria-hidden={!visible}
      >
        <TooltipText tooltipId={tooltipId} label={label} description={description} />
      </div>
    </div>
  )
}
