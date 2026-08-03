import React from 'react'
import { isVisibleWhen } from '../../registry/isVisibleWhen.js'
import { LayersMenuRadio } from './LayersMenuRadio.jsx'

export const LayersRadioGroupWrapper = ({ pluginState, menuGroup }) => {
  const { id, items, visibleWhen } = menuGroup
  const visible = visibleWhen ? isVisibleWhen(visibleWhen) : true
  if (!visible) {
    return null
  }

  const { menuState, dispatch } = pluginState
  const value = menuState[id]
  const handleChange = (event) => {
    dispatch({ type: 'UPDATE_MENU_STATE', payload: { [id]: event.target.value } })
  }

  const wrapperClass = 'govuk-form-group im-c-datasets-layers-group'
  return (
    <div key={menuGroup.id} className={wrapperClass}>
      <fieldset className='im-c-datasets-layers-group__fieldset'>
        <legend className='im-c-datasets-layers-group__legend'>
          {menuGroup.label}
        </legend>
        <div className='govuk-radios govuk-radios--small' data-module='govuk-radios'>
          {items.map((menuGroupItem) =>
            <LayersMenuRadio
              key={menuGroupItem.id}
              menuGroupItem={menuGroupItem}
              name={id}
              checked={menuGroupItem.id === value}
              onChange={handleChange}
            />
          )}
        </div>
      </fieldset>
    </div>
  )
}
