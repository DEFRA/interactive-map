import { KeyItem } from './KeyItem.jsx'

export const KeyGroupItem = ({ headingId, label, keyDefinitions, mapStyle }) => {
  return (
    <section className='im-c-map-key__group' aria-labelledby={headingId}>
      <h3 id={headingId} className='im-c-map-key__group-heading'>{label}</h3>
      <dl className='im-c-map-key-list'>
        {keyDefinitions.map(keyDefinition =>
          <KeyItem
            key={`${keyDefinition.id}`}
            keyDefinition={keyDefinition}
            mapStyle={mapStyle}
          />
        )}
      </dl>
    </section>
  )
}
