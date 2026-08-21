import React from 'react'
import { MenuCheckbox } from './MenuCheckbox.jsx'
import { MenuGroupWrapper } from './MenuGroupWrapper.jsx'

export const CheckboxGroupWrapper = ({ dispatch, menuGroup }) => {
  return (
    <MenuGroupWrapper menuGroup={menuGroup}> {
      // Each menuGroupItem
      menuGroup.items.map(menuGroupItem => (
        <MenuCheckbox
          key={menuGroupItem.id}
          dispatch={dispatch}
          menuGroupItem={menuGroupItem}
          onChange={menuGroupItem.handleOnChange}
        />)
      )
    }
    </MenuGroupWrapper>
  )
}
