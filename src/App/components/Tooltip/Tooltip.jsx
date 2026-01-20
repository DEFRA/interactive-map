import React, { useRef, useState, useEffect, cloneElement } from 'react'
import { useApp } from '../../store/appContext'
import { getTooltipPosition } from './getTooltipPosition.js'

let tooltipIdCounter = 0
const showDelay = 500
const hideDelay = 0

export const Tooltip = ({ children, content }) => {
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
    }
  }

  const childWithProps = cloneElement(children, {
    ref: mergeRefs,
    onMouseEnter: show,
    onMouseLeave: hide,
    onMouseDown: cancel,
    onKeyDown: cancel,
    onFocus: (e) => {
      if (interfaceType === 'keyboard') {
        show()
      }
      setFocused(true)
    },
    onBlur: (e) => {
      hide()
      setFocused(false)
    },
    'aria-labelledby': tooltipId
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
        {content}
      </div>
    </div>
  )
}
