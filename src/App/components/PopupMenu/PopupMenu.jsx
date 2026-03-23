import { createPortal } from 'react-dom'
import { stringToKebab } from '../../../utils/stringToKebab'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'
import { Icon } from '../Icon/Icon'
import { useEvaluateProp } from '../../hooks/useEvaluateProp.js'
import { usePopupMenu } from './usePopupMenu'

const MenuItem = ({ item, isSelected, hiddenButtons, disabledButtons, pressedButtons, id, onItemClick }) => (
  <li // NOSONAR
    id={`${id}-${stringToKebab(item.id)}`}
    className={`im-c-popup-menu__item${isSelected ? ' im-c-popup-menu__item--selected' : ''}`}
    role={item.isPressed !== undefined || item.pressedWhen ? 'menuitemcheckbox' : 'menuitem'} // NOSONAR
    aria-disabled={disabledButtons.has(item.id) || undefined} // NOSONAR
    aria-checked={(item.isPressed !== undefined || item.pressedWhen) ? pressedButtons.has(item.id) : undefined} // NOSONAR
    style={hiddenButtons.has(item.id) ? { display: 'none' } : undefined}
    onClick={(e) => onItemClick(e, item)} // NOSONAR
  >
    {(item.iconId || item.iconSvgContent) && <Icon id={item.iconId} svgContent={item.iconSvgContent} />}
    <span className='im-c-popup-menu__item-label'>{item.label}</span>
  </li>
)

export const PopupMenu = ({ popupMenuId, buttonId, instigatorId, pluginId, startPos, startIndex, menuRef, items, setIsOpen, buttonRect }) => {
  const { id } = useConfig()
  const { buttonRefs, buttonConfig, hiddenButtons, disabledButtons, pressedButtons, layoutRefs } = useApp()
  const instigatorKey = buttonId ?? instigatorId
  const instigator = buttonRefs.current[instigatorKey]
  const evaluateProp = useEvaluateProp()

  const { index, handleMenuKeyDown, handleItemClick, menuStyle, menuDirection, menuHAlign } = usePopupMenu({
    items,
    hiddenButtons,
    startIndex,
    startPos,
    instigator,
    instigatorKey,
    buttonRefs,
    buttonConfig,
    disabledButtons,
    pluginId,
    evaluateProp,
    id,
    menuRef,
    setIsOpen,
    buttonRect
  })

  return createPortal(
    <ul // NOSONAR
      ref={menuRef}
      id={popupMenuId}
      className='im-c-popup-menu'
      data-direction={menuDirection}
      data-halign={menuHAlign}
      style={menuStyle}
      role='menu' // NOSONAR
      tabIndex='-1'
      aria-labelledby={instigatorKey}
      aria-activedescendant={index >= 0 ? `${id}-${stringToKebab(items[index].id)}` : undefined}
      onKeyDown={handleMenuKeyDown}
    >
      {items.map((item, i) => (
        <MenuItem
          key={item.id}
          item={item}
          isSelected={index === i}
          hiddenButtons={hiddenButtons}
          disabledButtons={disabledButtons}
          pressedButtons={pressedButtons}
          id={id}
          onItemClick={handleItemClick}
        />
      ))}
    </ul>,
    layoutRefs?.appContainerRef?.current ?? document.body
  )
}
