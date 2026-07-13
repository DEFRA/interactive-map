import React, { useState } from 'react'
import { LayersMenuRadio } from './LayersMenuRadio.jsx'

export const LayersRadioGroupWrapper = ({ pluginState, menuGroup }) => {
  const { id, items } = menuGroup
  const { menuState, dispatch } = pluginState
  const [value, setValue] = useState(menuState[id])
  const handleChange = (event) => {
    setValue(event.target.value)
    dispatch({ type: 'UPDATE_MENU_STATE', payload: { [id]: event.target.value } })
  }
  const wrapperClass = 'govuk-form-group im-c-datasets-layers-group'
  return (
    <div key={menuGroup.id} className={wrapperClass}>
      <fieldset className='im-c-datasets-layers-group__fieldset'>
        <legend className='im-c-datasets-layers-group__legend'>
          {menuGroup.label}
        </legend>
        <div class='govuk-radios govuk-radios--small' data-module='govuk-radios'>
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
