import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'
import { KeySvg } from './KeySvg.jsx'

export const KeyItem = ({ registryDataset, symbolRegistry, patternRegistry, mapStyle }) => {
  if (!registryDataset.showInKey) {
    return null
  }
  return (
    <dl className='im-c-datasets-key__item'>
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
