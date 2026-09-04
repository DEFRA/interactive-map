import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'
import { KeySvg } from './KeySvg.jsx'

export const KeyItem = ({ keyDefinition, groupStyle, mapStyle }) => {
  // Pure derivations of props — computed directly on every render rather than staged through
  // useState/useEffect, so there's no post-mount frame where the label/description are blank
  // (every panel reopen mounts this fresh, so that frame was visible as a flicker).
  const label = keyDefinition.label
  const symbolDescription = getValueForStyle(keyDefinition.symbolDescription, mapStyle.id)

  return (
    <div className='im-c-map-key-list__item'>
      <dt className='im-c-map-key-list__item-symbol'>
        <KeySvg keyDefinition={keyDefinition} groupStyle={groupStyle} mapStyle={mapStyle} />
      </dt>
      <dd className='im-c-map-key-list__item-label'>
        {label}
        {symbolDescription && (
          <span className='govuk-visually-hidden'>
            ({symbolDescription})
          </span>
        )}
      </dd>
    </div>
  )
}
