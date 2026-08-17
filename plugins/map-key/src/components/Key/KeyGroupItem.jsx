import { KeyItem } from './KeyItem.jsx'

export const KeyGroupItem = ({ headingId, label, keyDefinitions, symbolRegistry, patternRegistry, mapStyle }) => {
  return (
    <section className='im-c-datasets-key__group' aria-labelledby={headingId}>
      <h3 id={headingId} className='im-c-datasets-key__group-heading'>{label}</h3>
      {keyDefinitions.map(keyDefinition =>
        <KeyItem
          key={`${keyDefinition.id}`}
          keyDefinition={keyDefinition}
          symbolRegistry={symbolRegistry}
          patternRegistry={patternRegistry}
          mapStyle={mapStyle}
        />
      )}
    </section>
  )
}
