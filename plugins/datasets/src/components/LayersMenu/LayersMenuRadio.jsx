import { isVisibleWhen } from '../../registry/isVisibleWhen.js'

export const LayersMenuRadio = ({ menuGroupItem, name, checked, onChange }) => {
  const itemClass = 'im-c-datasets-layers__item govuk-radios govuk-radios--small"'
  const { visibleWhen } = menuGroupItem
  const visible = visibleWhen ? isVisibleWhen(visibleWhen) : true
  if (!visible) {
    return null
  }
  return (
    <div className={itemClass} data-module='govuk-radios'>
      <div className='govuk-radios__item'>
        <input
          id={menuGroupItem.id}
          className='govuk-radios__input'
          type='radio'
          name={name}
          value={menuGroupItem.id}
          checked={checked}
          onChange={onChange}
        />
        <label className='im-c-datasets-layers__item-label govuk-label govuk-radios__label' htmlFor={menuGroupItem.id}>
          {menuGroupItem.label}
        </label>
      </div>
    </div>
  )
}
