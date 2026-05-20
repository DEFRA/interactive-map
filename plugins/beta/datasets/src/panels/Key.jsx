import React from 'react'
import { EmptyKey } from '../components/key/EmptyKey.jsx'
import { KeyItem } from '../components/key/KeyItem.jsx'
import { KeyGroupItem } from '../components/key/KeyGroupItem.jsx'
import { datasetRegistry } from '../registry/datasetRegistry.js'

export const Key = ({
  pluginConfig: { noKeyItemText },
  mapState: { mapStyle },
  pluginState: { mappedDatasets },
  services: { symbolRegistry, patternRegistry }
}) => {
  const { items: keyGroups, hasGroups } = datasetRegistry.keyItems()

  if (!keyGroups?.length) {
    return (<EmptyKey text={noKeyItemText} />)
  }

  const containerClass = `im-c-datasets-key${hasGroups ? ' im-c-datasets-key--has-groups' : ''}`
  return (
    <div className={containerClass}>{keyGroups.map(item => {
      const key = item.type === 'group' ? item.groupLabel.toLowerCase().replaceAll(/\s+/g, '-') : item.dataset.id

      if (item.type === 'sublayers' || item.type === 'group') {
        const datasets = item.type === 'sublayers' ? item.sublayers : item.datasets
        const label = item.type === 'sublayers' ? item.dataset.label : item.groupLabel
        return (
          <KeyGroupItem
            key={key}
            headingId={`key-heading-${key}`}
            label={label}
            datasets={datasets}
            symbolRegistry={symbolRegistry}
            patternRegistry={patternRegistry}
            mapStyle={mapStyle}
          />
        )
      }
      return (
        <KeyItem
          key={key}
          registryDataset={item.dataset}
          symbolRegistry={symbolRegistry}
          patternRegistry={patternRegistry}
          mapStyle={mapStyle}
        />
      )
    })}
    </div>
  )
}
