import { KeyItem } from './KeyItem.jsx'

export const KeyGroupItem = ({ headingId, label, keyDefinitions, mapStyle }) => {
  return (
    <section className='im-c-menu__group' aria-labelledby={headingId}>
      <h3 id={headingId} className='im-c-menu__group-heading'>{label}</h3>
      {keyDefinitions.map(keyDefinition =>
        <KeyItem
          key={`${keyDefinition.id}`}
          keyDefinition={keyDefinition}
          mapStyle={mapStyle}
        />
      )}
    </section>
  )
}
