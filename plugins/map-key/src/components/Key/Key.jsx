import React from 'react'
import { EmptyKey } from './EmptyKey.jsx'
import { KeyItem } from './KeyItem.jsx'
import { KeyGroupItem } from './KeyGroupItem.jsx'

const keyClassName = 'im-c-map-key'
const keyGroupsClassName = 'im-c-map-key--has-groups'

const KeyItemWrapper = ({ item, mapStyle }) => {
  if (item.type === 'group') {
    return (
      <KeyGroupItem
        headingId={`key-heading-${item.id}`}
        label={item.groupLabel}
        groupStyle={item.groupStyle}
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
  // Pure derivation of hasGroups — computed directly during render (see KeyItem.jsx for why:
  // staging this through useState/useEffect meant a mount with groups briefly rendered without
  // the --has-groups modifier, using flat spacing before the effect corrected it).
  const className = hasGroups ? `${keyClassName} ${keyGroupsClassName}` : keyClassName
  console.log('keyGroups', keyGroups)
  return (
    <div className={className}>
      {keyGroups.map(item => <KeyItemWrapper key={item.id} item={item} mapStyle={mapStyle} />)}
    </div>
  )
}
