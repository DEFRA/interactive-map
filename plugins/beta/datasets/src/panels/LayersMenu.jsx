import React from 'react'
import { setDatasetVisibility } from '../api/setDatasetVisibility'
import { LayersMenuCheckbox } from '../components/menu/LayersMenuCheckbox.jsx'
import { LayersMenuGroupWrapper } from '../components/menu/LayersMenuGroupWrapper.jsx'

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
        menu.map(menuGroup =>
          <LayersMenuGroupWrapper key={menuGroup.id} menuGroup={menuGroup}>
            {// Each menuGroupItem
              menuGroup.items.map(menuGroupItem =>
                <LayersMenuCheckbox
                  key={menuGroupItem.id}
                  menuGroupItem={menuGroupItem}
                  onChange={handleDatasetChange}
                />
              )
            }
          </LayersMenuGroupWrapper>)
      }
    </div>
  )
}
