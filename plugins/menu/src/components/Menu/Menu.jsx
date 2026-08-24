import React from 'react'
import { MenuGroup } from './MenuGroup.jsx'
import { IdPrefixContext } from './useIdPrefix.jsx'

export const Menu = ({ pluginState, appConfig }) => {
  const { menu = [], dispatch, menuState } = pluginState
  const appId = appConfig?.id || 'map'
  const hasGroups = menu.some(item => item.groupLabel)
  const containerClass = `im-c-menu${hasGroups ? ' im-c-menu--has-groups' : ''}`
  return (
    <IdPrefixContext value={`${appId}-menu`}>
      <div className={containerClass}> {
          menu.map(menuGroup =>
            <MenuGroup key={menuGroup.id} menuGroup={menuGroup} dispatch={dispatch} menuState={menuState} />)
      }
      </div>
    </IdPrefixContext>
  )
}
