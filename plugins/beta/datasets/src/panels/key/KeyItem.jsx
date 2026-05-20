import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle'
import { KeySvg } from '../../components/key/KeySvg.jsx'

export const KeyItem = ({ key, registryDataset, symbolRegistry, patternRegistry, mapStyle }) => {
  return (
    <dl key={key} className='im-c-datasets-key__item'>
      <dt className='im-c-datasets-key__item-symbol'>
        <KeySvg registryDataset={registryDataset} symbolRegistry={symbolRegistry} patternRegistry={patternRegistry} mapStyle={mapStyle} />
      </dt>
      <dd className='im-c-datasets-key__item-label'>
        {registryDataset.label}
        {registryDataset.symbolDescription && (
          <span className='govuk-visually-hidden'>
            ({getValueForStyle(registryDataset.symbolDescription, mapStyle.id)})
          </span>
        )}
      </dd>
    </dl>
  )
}
