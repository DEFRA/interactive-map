// components/MapButton.jsx
import React, { useState, useRef } from 'react'
import { stringToKebab } from '../../../utils/stringToKebab'
import { Tooltip } from '../Tooltip/Tooltip'
import { Icon } from '../Icon/Icon'
import { SlotRenderer } from '../../renderer/SlotRenderer'
import { PopupMenu } from '../PopupMenu/PopupMenu'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'

/**
 * Builds CSS class names for the map button element.
 * @param {string} buttonId - Unique identifier for the button (kebab-cased)
 * @param {string} variant - Visual variant of the button (e.g., 'primary', 'secondary')
 * @param {boolean} showLabel - Whether the button label is displayed
 * @returns {string} Space-separated CSS class names
 */
const buildButtonClassNames = (buttonId, variant, showLabel) => [
  'im-c-map-button',
  buttonId && `im-c-map-button--${stringToKebab(buttonId)}`,
  variant && `im-c-map-button--${variant}`,
  showLabel && 'im-c-map-button--with-label'
].filter(Boolean).join(' ')

/**
 * Builds CSS class names for the wrapper div that contains the button.
 * @param {string} buttonId - Unique identifier for the button
 * @param {boolean} showLabel - Whether the button label is displayed
 * @param {boolean} groupStart - Whether this button is at the start of a button group
 * @param {boolean} groupMiddle - Whether this button is in the middle of a button group
 * @param {boolean} groupEnd - Whether this button is at the end of a button group
 * @returns {string} Space-separated CSS class names for the wrapper
 */
const buildWrapperClassNames = (buttonId, showLabel, groupStart, groupMiddle, groupEnd) => [
  'im-c-button-wrapper',
  buttonId && `im-c-button-wrapper--${stringToKebab(buttonId)}`,
  showLabel && 'im-c-button-wrapper--wide',
  groupStart && 'im-c-button-wrapper--group-start',
  groupMiddle && 'im-c-button-wrapper--group-middle',
  groupEnd && 'im-c-button-wrapper--group-end'
].filter(Boolean).join(' ')

/**
 * Handles spacebar key presses on anchor links by triggering a click event.
 * This ensures anchor buttons behave like standard buttons when spacebar is pressed.
 * @param {KeyboardEvent} e - The keyboard event
 */
const handleKeyUp = (e) => {
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault()
    e.currentTarget.click()
  }
}

/**
 * Determines the controlled element (panel or popup menu) for ARIA attributes.
 * @param {Object} options - Configuration options
 * @param {string} options.idPrefix - Prefix for generated IDs
 * @param {string} options.panelId - ID of the controlled panel (if applicable)
 * @param {string} options.buttonId - Unique button identifier
 * @param {boolean} options.hasMenu - Whether the button has a popup menu
 * @returns {Object|null} Object with id and type ('panel' or 'popup'), or null if no controlled element
 */
const getControlledElement = ({ idPrefix, panelId, buttonId, hasMenu }) => {
  if (panelId) {
    return { id: `${idPrefix}-panel-${stringToKebab(panelId)}`, type: 'panel' }
  }
  if (hasMenu) {
    return { id: `${idPrefix}-popup-${stringToKebab(buttonId)}`, type: 'popup' }
  }
  return null
}

/**
 * Builds the complete props object for a button or anchor element.
 * Handles ARIA attributes, event handlers, refs, and conditional styling.
 * @param {Object} options - Configuration options
 * @param {string} options.appId - Application identifier
 * @param {string} options.buttonId - Unique button identifier
 * @param {string} options.className - CSS classes for the button
 * @param {Function} options.onClick - Click event handler
 * @param {Function} options.onKeyUp - Key up event handler
 * @param {Object} options.buttonRefs - React ref object for storing button references
 * @param {boolean} options.isDisabled - Whether the button is disabled
 * @param {boolean} options.isPressed - Whether the button is in pressed state
 * @param {boolean} options.isExpanded - Whether content controlled by button is expanded
 * @param {boolean} options.isPanelOpen - Whether the controlled panel is open
 * @param {boolean} options.isPopupOpen - Whether the popup menu is open
 * @param {Object|null} options.controlledElement - The element controlled by this button
 * @param {string} options.href - URL for anchor element (if provided, renders as <a> instead of <button>)
 * @returns {Object} Props object suitable for button or anchor element
 */
const buildButtonProps = ({
  appId,
  buttonId,
  className,
  onClick,
  onKeyUp,
  buttonRefs,
  isDisabled,
  isPressed,
  isExpanded,
  isPanelOpen,
  isPopupOpen,
  controlledElement,
  href
}) => {
  let ariaExpanded
  if (controlledElement?.type === 'panel') {
    ariaExpanded = String(isPanelOpen)
  } else if (controlledElement?.type === 'popup') {
    ariaExpanded = isPopupOpen
  } else if (typeof isExpanded === 'boolean') {
    ariaExpanded = isExpanded
  } else {
    // No action
  }

  return {
    id: `${appId}-${stringToKebab(buttonId)}`,
    className,
    onClick,
    onKeyUp,
    ref: (el) => {
      if (buttonRefs.current && buttonId) {
        buttonRefs.current[buttonId] = el
      }
    },
    'aria-disabled': isDisabled || undefined,
    'aria-expanded': ariaExpanded,
    'aria-pressed': typeof isPressed === 'boolean' ? isPressed : undefined,
    'aria-controls': controlledElement?.id,
    'aria-haspopup': controlledElement?.type === 'popup' || undefined,
    ...(href
      ? { href, target: '_blank', onKeyUp: handleKeyUp, role: 'button' }
      : { type: 'button' })
  }
}

/**
 * MapButton component - A versatile button for map applications.
 * Supports icons, labels, popups, panels, tooltips, and button grouping.
 * Renders as either a <button> or <a> element depending on props.
 * @component
 * @param {Object} props - Component props
 * @param {string} props.buttonId - Unique identifier for the button
 * @param {string} [props.iconId] - Icon identifier to display
 * @param {string} [props.iconSvgContent] - SVG content as an alternative to iconId
 * @param {string} props.label - Button label/tooltip text
 * @param {boolean} [props.showLabel=false] - Whether to display the label visually
 * @param {boolean} [props.isDisabled=false] - Whether the button is disabled
 * @param {boolean} [props.isPressed] - Whether the button is in pressed state (aria-pressed)
 * @param {boolean} [props.isExpanded] - Whether content controlled by the button is expanded
 * @param {boolean} [props.isHidden=false] - Whether to hide the button (CSS display: none)
 * @param {boolean} [props.isPanelOpen=false] - Whether the controlled panel is open
 * @param {string} [props.variant] - CSS variant class for styling (e.g., 'primary')
 * @param {Function} [props.onClick] - Custom click handler
 * @param {string} [props.panelId] - ID of the panel controlled by this button
 * @param {Array<Object>} [props.menuItems] - Array of items for popup menu
 * @param {string} [props.idPrefix=''] - Prefix for generated panel/popup IDs
 * @param {string} [props.href] - URL for anchor element; if provided, renders as <a> instead of <button>
 * @param {boolean} [props.groupStart=false] - Whether button is at start of button group
 * @param {boolean} [props.groupMiddle=false] - Whether button is in middle of button group
 * @param {boolean} [props.groupEnd=false] - Whether button is at end of button group
 * @returns {JSX.Element} The rendered button component
 */
export const MapButton = ({
  buttonId,
  iconId,
  iconSvgContent,
  label,
  showLabel,
  isDisabled,
  isPressed,
  isExpanded,
  isHidden,
  isPanelOpen,
  variant,
  onClick,
  panelId,
  menuItems,
  idPrefix,
  href,
  groupMiddle,
  groupStart,
  groupEnd
}) => {
  const { id: appId } = useConfig()
  const { buttonRefs } = useApp()
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [menuStartPos, setMenuStartPos] = useState(null)
  const menuRef = useRef(null)

  const Element = href ? 'a' : 'button'
  const hasMenu = menuItems?.length >= 1
  const controlledElement = getControlledElement({ idPrefix, panelId, buttonId, hasMenu })

  /**
   * Handles button click events.
   * Toggles popup menu visibility if the button controls a popup.
   * Calls the custom onClick handler if provided.
   * @param {React.MouseEvent} e - The click event
   */
  const handleButtonClick = (e) => {
    if (isDisabled) {
      return
    }
    if (controlledElement?.type === 'popup') {
      const isKeyboard = e.nativeEvent.pointerType === ''
      /* istanbul ignore next as pointerType can't be tested in jest */
      setMenuStartPos(isKeyboard ? 'first' : null)
      setIsPopupOpen((prev) => !prev)
    }
    if (onClick) {
      onClick(e)
    }
  }

  /**
   * Handles key up events on buttons that control popup menus.
   * ArrowDown opens the menu at the first item.
   * ArrowUp opens the menu at the last item.
   * @param {React.KeyboardEvent} e - The keyboard event
   */
  const handleButtonKeyUp = e => {
    if (hasMenu && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault()
      setMenuStartPos(e.key === 'ArrowUp' ? 'last' : 'first')
      setIsPopupOpen(true)
    }
  }

  const buttonProps = buildButtonProps({
    appId,
    buttonId,
    className: buildButtonClassNames(buttonId, variant, showLabel),
    onClick: handleButtonClick,
    onKeyUp: handleButtonKeyUp,
    buttonRefs,
    isDisabled,
    isPressed,
    isExpanded,
    isPanelOpen,
    isPopupOpen,
    controlledElement,
    href
  })

  const buttonEl = (
    <Element {...buttonProps}>
      {(iconId || iconSvgContent) && <Icon id={iconId} svgContent={iconSvgContent} />}
      {showLabel && <span>{label}</span>}
    </Element>
  )

  return (
    <div
      className={buildWrapperClassNames(buttonId, showLabel, groupStart, groupMiddle, groupEnd)}
      style={isHidden ? { display: 'none' } : undefined}
    >
      {showLabel ? buttonEl : <Tooltip content={label}>{buttonEl}</Tooltip>}
      {panelId && <SlotRenderer slot={`${stringToKebab(buttonId)}-button`} />}
      {isPopupOpen && <PopupMenu id={controlledElement.id} startPos={menuStartPos} instigatorId={buttonId} menuRef={menuRef} items={menuItems} setIsOpen={setIsPopupOpen} />}
    </div>
  )
}
