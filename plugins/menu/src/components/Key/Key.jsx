import React, { useEffect, useState } from 'react'
import { EmptyKey } from './EmptyKey.jsx'
import { KeyItem } from './KeyItem.jsx'
import { KeyGroupItem } from './KeyGroupItem.jsx'

const keyClassName = 'im-c-menu'
const keyGroupsClassName = 'im-c-menu--has-groups'

const KeyItemWrapper = ({ item, mapStyle }) => {
  if (item.type === 'group') {
    return (
      <KeyGroupItem
        headingId={`key-heading-${item.id}`}
        label={item.groupLabel}
        keyDefinitions={item.keyDefinitions}
        mapStyle={mapStyle}
      />
    )
  } else {
    return (<KeyItem keyDefinition={item.keyDefinition} mapStyle={mapStyle} />)
  }
}

export const Key = ({
  noKeyItemText,
  keyGroups,
  hasGroups,
  mapStyle
}) => {
  if (!keyGroups?.length) {
    return (<EmptyKey text={noKeyItemText} />)
  }

  const [className, setClassName] = useState('im-c-menu')
  useEffect(() => setClassName(hasGroups ? `${keyClassName} ${keyGroupsClassName}` : keyClassName), [hasGroups])

  return (
    <div className={className}>
      {keyGroups.map(item => <KeyItemWrapper key={item.id} item={item} mapStyle={mapStyle} />)}
    </div>
  )
}
