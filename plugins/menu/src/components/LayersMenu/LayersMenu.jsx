import React from 'react'
// import { setDatasetVisibility } from '../../api/setDatasetVisibility.js'
import { LayersMenuCheckbox } from './LayersMenuCheckbox.jsx'
import { LayersRadioGroupWrapper } from './LayersRadioGroupWrapper.jsx'
import { LayersMenuGroupWrapper } from './LayersMenuGroupWrapper.jsx'

export const LayersMenu = ({ pluginState }) => {
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
              <LayersMenuGroupWrapper key={menuGroup.id} menuGroup={menuGroup}> {
                // Each menuGroupItem
                menuGroup.items.map(menuGroupItem => (
                  <LayersMenuCheckbox
                    key={menuGroupItem.id}
                    dispatch={dispatch}
                    menuGroupItem={menuGroupItem}
                    onChange={menuGroupItem.handleOnChange}
                  />)
                )
              }
              </LayersMenuGroupWrapper>
            )
          } else {
            return (
              <LayersRadioGroupWrapper
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
