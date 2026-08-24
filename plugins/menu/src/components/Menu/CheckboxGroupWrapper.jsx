import React from 'react'
import { MenuCheckbox } from './MenuCheckbox.jsx'
import { GroupLegend } from './GroupLegend.jsx'

export const CheckboxGroupWrapper = ({ dispatch, menuGroup, menuState }) => {
  return (
    <GroupLegend menuGroup={menuGroup}> {
      // Each menuGroupItem
      menuGroup.items.map(menuGroupItem => (
        <MenuCheckbox
          key={menuGroupItem.id}
          dispatch={dispatch}
          menuGroupItem={menuGroupItem}
          checked={menuState[menuGroupItem.id]}
          onChange={menuGroupItem.handleOnChange}
        />)
      )
    }
    </GroupLegend>
  )
}
