// components/MapButton.jsx
import { stringToKebab } from '../../../utils/stringToKebab'
import { Tooltip } from '../Tooltip/Tooltip'
import { Icon } from '../Icon/Icon'
import { SlotRenderer } from '../../renderer/SlotRenderer'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'

const buildButtonClassNames = (buttonId, variant, showLabel) => [
  'im-c-map-button',
  buttonId && `im-c-map-button--${stringToKebab(buttonId)}`,
  variant && `im-c-map-button--${variant}`,
  showLabel && 'im-c-map-button--with-label'
].filter(Boolean).join(' ')

const buildWrapperClassNames = (showLabel, groupStart, groupMiddle, groupEnd) => [
  'im-c-button-wrapper',
  showLabel && 'im-c-button-wrapper--wide',
  groupStart && 'im-c-button-wrapper--group-start',
  groupMiddle && 'im-c-button-wrapper--group-middle',
  groupEnd && 'im-c-button-wrapper--group-end'
].filter(Boolean).join(' ')

const handleKeyUp = (e) => {
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault() // prevent page scrolling
    e.currentTarget.click() // trigger click
  }
}

const buildButtonProps = ({ appId, buttonId, className, onClick, buttonRefs, isDisabled, isExpanded, panelId, isOpen, isPressed, idPrefix, href }) => ({
  id: `${appId}-${stringToKebab(buttonId)}`,
  className,
  onClick,
  ref: (el) => {
    if (buttonRefs.current && buttonId) {
      buttonRefs.current[buttonId] = el
    }
  },
  'aria-disabled': isDisabled || undefined,
  'aria-expanded': typeof isExpanded === 'boolean' ? isExpanded : undefined,
  'aria-pressed': panelId ? String(isOpen) : isPressed,
  'aria-controls': panelId ? `${idPrefix}-panel-${stringToKebab(panelId)}` : undefined,
  ...(href
    ? { href, target: '_blank', onKeyUp: handleKeyUp, role: 'button' } // only <a>
    : { type: 'button' } // only <button>
  )
})

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const MapButton = ({
  buttonId,
  iconId,
  iconSvgContent,
  label,
  showLabel,
  isDisabled,
  isExpanded,
  isPressed,
  isHidden,
  isOpen,
  variant,
  onClick,
  panelId,
  idPrefix,
  href,
  groupMiddle,
  groupStart,
  groupEnd
}) => {
  const { id: appId } = useConfig()
  const { buttonRefs } = useApp()

  const Element = href ? 'a' : 'button'

  const buttonProps = buildButtonProps({
    appId,
    buttonId,
    className: buildButtonClassNames(buttonId, variant, showLabel),
    onClick,
    buttonRefs,
    isDisabled,
    isExpanded,
    panelId,
    isOpen,
    isPressed,
    idPrefix,
    href
  })

  const buttonEl = (
    <Element {...buttonProps}>
      {(iconId || iconSvgContent) && <Icon id={iconId} svgContent={iconSvgContent} />}
      {showLabel && <span>{label}</span>}
    </Element>
  )

  return (
    <div className={buildWrapperClassNames(showLabel, groupStart, groupMiddle, groupEnd)} style={isHidden ? { display: 'none' } : undefined}>
      {showLabel ? buttonEl : <Tooltip content={label}>{buttonEl}</Tooltip>}
      {panelId && <SlotRenderer slot={`${stringToKebab(buttonId)}-button`} />}
    </div>
  )
}
