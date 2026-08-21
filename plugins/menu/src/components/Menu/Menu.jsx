import React from 'react'
import { RadioGroupWrapper } from './RadioGroupWrapper.jsx'
import { CheckboxGroupWrapper } from './CheckboxGroupWrapper.jsx'

export const Menu = ({ pluginState }) => {
  const { menu = [], dispatch, menuState } = pluginState

  const hasGroups = menu.some(item => item.groupLabel)
  const containerClass = `im-c-menu-layers${hasGroups ? ' im-c-menu-layers--has-groups' : ''}`
  return (
    <div className={containerClass}> {
        menu.map(menuGroup => {
          if (menuGroup.type === 'checkbox') {
            return (<CheckboxGroupWrapper key={menuGroup.id} menuGroup={menuGroup} dispatch={dispatch} />)
          } else {
            return (<RadioGroupWrapper key={menuGroup.id} menuGroup={menuGroup} dispatch={dispatch} menuState={menuState} />)
          }
        })
      }
    </div>
  )
}
