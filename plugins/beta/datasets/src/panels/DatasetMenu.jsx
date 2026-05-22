import React from 'react'
import { setDatasetVisibility } from '../api/setDatasetVisibility'
import { DatasetMenuCheckbox } from '../components/menu/DatasetMenuCheckbox.jsx'
import { DatasetMenuGroupWrapper } from '../components/menu/DatasetMenuGroupWrapper.jsx'

export const DatasetMenu = ({ pluginState }) => {
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
          <DatasetMenuGroupWrapper key={menuGroup.id} menuGroup={menuGroup}>
            {// Each menuGroupItem
              menuGroup.items.map(menuGroupItem =>
                <DatasetMenuCheckbox
                  key={menuGroupItem.id}
                  menuGroupItem={menuGroupItem}
                  onChange={handleDatasetChange}
                />
              )
            }
          </DatasetMenuGroupWrapper>)
      }
    </div>
  )
}
