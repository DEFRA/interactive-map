import React from 'react'
import { setDatasetVisibility } from '../../api/setDatasetVisibility.js'
import { LayersMenuCheckbox } from './LayersMenuCheckbox.jsx'
import { LayersRadioGroupWrapper } from './LayersRadioGroupWrapper.jsx'
import { LayersMenuGroupWrapper } from './LayersMenuGroupWrapper.jsx'

export const LayersMenu = ({ pluginState }) => {
  const { menu = [] } = pluginState

  const handleDatasetChange = (e) => {
    const { value, checked } = e.target
    setDatasetVisibility({ pluginState }, checked, { datasetId: value })
  }

  const hasGroups = menu.some(item => item.groupLabel)
  const containerClass = `im-c-datasets-layers${hasGroups ? ' im-c-datasets-layers--has-groups' : ''}`
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
                    menuGroupItem={menuGroupItem}
                    onChange={handleDatasetChange}
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
