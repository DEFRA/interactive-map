import { KeyItem } from './KeyItem.jsx'

export const KeyGroupItem = ({ headingId, label, datasets, symbolRegistry, patternRegistry, mapStyle }) => {
  return (
    <section className='im-c-datasets-key__group' aria-labelledby={headingId}>
      <h3 id={headingId} className='im-c-datasets-key__group-heading'>{label}</h3>
      {datasets.map(dataset =>
        <KeyItem
          key={`${dataset.id}`}
          registryDataset={dataset}
          symbolRegistry={symbolRegistry}
          patternRegistry={patternRegistry}
          mapStyle={mapStyle}
        />
      )}
    </section>
  )
}
