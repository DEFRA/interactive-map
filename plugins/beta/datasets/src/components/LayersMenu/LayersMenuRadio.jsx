// import { datasetRegistry } from '../../registry/datasetRegistry.js'

export const LayersMenuRadio = ({ menuState, menuGroupItem, checked, name, onChange }) => {
  const itemClass = 'im-c-datasets-layers__item govuk-radios govuk-radios--small"'
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
