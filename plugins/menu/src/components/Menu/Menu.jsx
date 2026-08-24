import React from 'react'
import { MenuGroup } from './MenuGroup.jsx'

export const Menu = ({ pluginState }) => {
  const { menu = [], dispatch, menuState } = pluginState
  const hasGroups = menu.some(item => item.groupLabel)
  const containerClass = `im-c-menu-layers${hasGroups ? ' im-c-menu-layers--has-groups' : ''}`
  return (
    <div className={containerClass}> {
        menu.map(menuGroup =>
          <MenuGroup key={menuGroup.id} menuGroup={menuGroup} dispatch={dispatch} menuState={menuState} />)
    }
    </div>
  )
}
