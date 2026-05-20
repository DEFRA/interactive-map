import React from 'react'
import { EmptyKey } from '../components/key/EmptyKey.jsx'
import { KeyItem } from './key/KeyItem.jsx'
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
    <div className={containerClass}>
      {keyGroups.map(item => {
        if (item.type === 'sublayers') {
          const headingId = `key-heading-${item.dataset.id}`
          return (
            <section key={item.dataset.id} className='im-c-datasets-key__group' aria-labelledby={headingId}>
              <h3 id={headingId} className='im-c-datasets-key__group-heading'>{item.dataset.label}</h3>
              {item.sublayers.map(sublayer =>
                <KeyItem key={`${sublayer.id}`} registryDataset={sublayer} symbolRegistry={symbolRegistry} patternRegistry={patternRegistry} mapStyle={mapStyle} />
              )}
            </section>
          )
        }

        if (item.type === 'group') {
          const headingId = `key-heading-${item.groupLabel.toLowerCase().replaceAll(/\s+/g, '-')}`
          return (
            <section key={item.groupLabel} className='im-c-datasets-key__group' aria-labelledby={headingId}>
              <h3 id={headingId} className='im-c-datasets-key__group-heading'>{item.groupLabel}</h3>
              {item.datasets.map(dataset => <KeyItem key={`${dataset.id}`} registryDataset={dataset} symbolRegistry={symbolRegistry} patternRegistry={patternRegistry} mapStyle={mapStyle} />)}
            </section>
          )
        }

        return <KeyItem key={`${item.dataset.id}`} registryDataset={item.dataset} symbolRegistry={symbolRegistry} patternRegistry={patternRegistry} mapStyle={mapStyle} />
      })}
    </div>
  )
}
