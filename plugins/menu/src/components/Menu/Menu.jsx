import React from 'react'
// import { setDatasetVisibility } from '../../api/setDatasetVisibility.js'
import { MenuCheckbox } from './MenuCheckbox.jsx'
import { RadioGroupWrapper } from './RadioGroupWrapper.jsx'
import { CheckboxGroupWrapper } from './CheckboxGroupWrapper.jsx'

export const Menu = ({ pluginState }) => {
  const { menu = [], dispatch } = pluginState

  const hasGroups = menu.some(item => item.groupLabel)
  const containerClass = `im-c-menu-layers${hasGroups ? ' im-c-menu-layers--has-groups' : ''}`
  return (
    <div className={containerClass}>
      {// Each menuGroup
        menu.map(menuGroup => {
          const { type } = menuGroup
          if (type === 'checkbox') {
            return (
              <CheckboxGroupWrapper key={menuGroup.id} menuGroup={menuGroup}> {
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
              </CheckboxGroupWrapper>
            )
          } else {
            return (
              <RadioGroupWrapper
                key={menuGroup.id}
                menuGroup={menuGroup}
                pluginState={pluginState}
              />
            )
          }
        }
        )
      }
    </div>
  )
}
