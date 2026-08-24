import { isVisibleWhen } from '../../registry/isVisibleWhen.js'
import { useIdPrefix } from './useIdPrefix.jsx'

export const MenuRadio = ({ menuGroupItem, name, checked, onChange }) => {
  const itemClass = 'im-c-menu-layers__item govuk-radios govuk-radios--small"'
  const itemId = useIdPrefix(`radio-${menuGroupItem.id}`)
  const { visibleWhen } = menuGroupItem
  const visible = visibleWhen ? isVisibleWhen(visibleWhen) : true
  if (!visible) {
    return null
  }
  return (
    <div className={itemClass} data-module='govuk-radios'>
      <div className='govuk-radios__item'>
        <input
          id={itemId}
          className='govuk-radios__input'
          type='radio'
          name={name}
          value={menuGroupItem.id}
          checked={checked}
          onChange={onChange}
        />
        <label className='im-c-menu-layers__item-label govuk-label govuk-radios__label' htmlFor={itemId}>
          {menuGroupItem.label}
        </label>
      </div>
    </div>
  )
}
