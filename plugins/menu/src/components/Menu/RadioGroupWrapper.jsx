import React from 'react'
import { isVisibleWhen } from '../../registry/isVisibleWhen.js'
import { MenuRadio } from './MenuRadio.jsx'
import { CheckboxGroupWrapper } from './CheckboxGroupWrapper.jsx'
export const RadioGroupWrapper = ({ pluginState, menuGroup }) => {
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

  return (
    <CheckboxGroupWrapper key={menuGroup.id} menuGroup={menuGroup}>
      <div className='govuk-radios govuk-radios--small' data-module='govuk-radios'>
        {items.map((menuGroupItem) =>
          <MenuRadio
            key={menuGroupItem.id}
            menuGroupItem={menuGroupItem}
            name={id}
            checked={menuGroupItem.id === value}
            onChange={handleChange}
          />
        )}
      </div>
    </CheckboxGroupWrapper>
  )
}
