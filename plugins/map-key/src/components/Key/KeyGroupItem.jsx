import { KeyItem } from './KeyItem.jsx'

export const KeyGroupItem = ({ headingId, label, groupStyle, keyDefinitions, mapStyle, symbolRegistry, patternRegistry }) => {
  const className = 'im-c-map-key-list' + (groupStyle ? ` im-c-map-key-list-${groupStyle}` : '')
  return (
    <section className='im-c-map-key__group' aria-labelledby={headingId}>
      <h3 id={headingId} className='im-c-map-key__group-heading'>{label}</h3>
      <dl className={className}>
        {keyDefinitions.map(keyDefinition =>
          <KeyItem
            key={`${keyDefinition.id}`}
            keyDefinition={keyDefinition}
            mapStyle={mapStyle}
            symbolRegistry={symbolRegistry}
            patternRegistry={patternRegistry}
            groupStyle={groupStyle}
          />
        )}
      </dl>
    </section>
  )
}
