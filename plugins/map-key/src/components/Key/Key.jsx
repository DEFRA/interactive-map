import React from 'react'
import { EmptyKey } from './EmptyKey.jsx'
import { KeyItem } from './KeyItem.jsx'
import { KeyGroupItem } from './KeyGroupItem.jsx'

export const Key = ({
  noKeyItemText,
  keyGroups,
  hasGroups,
  mapStyle
}) => {
  if (!keyGroups?.length) {
    return (<EmptyKey text={noKeyItemText} />)
  }

  const containerClass = `im-c-map-key${hasGroups ? ' im-c-map-key--has-groups' : ''}`
  return (
    <div className={containerClass}>{keyGroups.map(item => {
      const key = item.type === 'group' ? item.groupLabel.toLowerCase().replaceAll(/\s+/g, '-') : item.keyDefinition.id

      if (item.type === 'group') {
        return (
          <KeyGroupItem
            key={key}
            headingId={`key-heading-${key}`}
            label={item.groupLabel}
            keyDefinitions={item.keyDefinitions}
            mapStyle={mapStyle}
          />
        )
      }
      return (
        <KeyItem
          key={key}
          keyDefinition={item.keyDefinition}
          mapStyle={mapStyle}
        />
      )
    })}
    </div>
  )
}
