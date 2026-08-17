import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'
import { KeySvg } from './KeySvg.jsx'

export const KeyItem = ({ keyDefinition, mapStyle }) => {
  return (
    <dl className='im-c-map-key__item'>
      <dt className='im-c-map-key__item-symbol'>
        <KeySvg keyDefinition={keyDefinition} mapStyle={mapStyle} />
      </dt>
      <dd className='im-c-map-key__item-label'>
        {keyDefinition.label}
        {keyDefinition.symbolDescription && (
          <span className='govuk-visually-hidden'>
            ({getValueForStyle(keyDefinition.symbolDescription, mapStyle.id)})
          </span>
        )}
      </dd>
    </dl>
  )
}
