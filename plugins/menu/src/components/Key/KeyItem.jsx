import { useEffect, useState } from 'react'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'
import { KeySvg } from './KeySvg.jsx'

export const KeyItem = ({ keyDefinition, mapStyle }) => {
  const [label, setLabel] = useState('')
  const [symbolDescription, setSymbolDescription] = useState('')

  useEffect(() => {
    setLabel(keyDefinition.label)
    setSymbolDescription(getValueForStyle(keyDefinition.symbolDescription, mapStyle.id))
  }, [keyDefinition, mapStyle.id])

  return (
    <dl className='im-c-menu__item'>
      <dt className='im-c-menu__item-symbol'>
        <KeySvg keyDefinition={keyDefinition} mapStyle={mapStyle} />
      </dt>
      <dd className='im-c-menu__item-label'>
        {label}
        {symbolDescription && (
          <span className='govuk-visually-hidden'>
            ({symbolDescription})
          </span>
        )}
      </dd>
    </dl>
  )
}
