import { useRef } from 'react'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'
import { hasSymbol } from '../../../../../src/utils/symbolUtils.js'
import { KeyItem } from './KeyItem.jsx'
import { RAMP } from '../../utils/groupStyles.js'
import { useRampOrientation } from './useRampOrientation.js'

const getListClassName = (groupStyle, orientation, hasStroke) => {
  if (!groupStyle) {
    return 'im-c-map-key-list'
  }
  const className = `im-c-map-key-list im-c-map-key-list--${groupStyle}`
  if (groupStyle !== RAMP) {
    return className
  }
  // Stroked ramp bands are separated by a gap; unstroked bands butt up to each other
  const rampClassName = `${className} im-c-map-key-list--ramp-${orientation}`
  return hasStroke ? `${rampClassName} im-c-map-key-list--has-stroke` : rampClassName
}

// A ramp's bands stretch to fill their row or column, which point symbols can't, so a ramp
// group with any symbol entries is shown as a standard group
const getGroupStyle = (groupStyle, keyDefinitions) =>
  groupStyle === RAMP && keyDefinitions.some(keyDefinition => hasSymbol(keyDefinition.style))
    ? undefined
    : groupStyle

export const KeyGroupItem = ({ headingId, label, groupStyle: configuredGroupStyle, keyDefinitions, mapStyle, symbolRegistry, patternRegistry }) => {
  const listRef = useRef(null)
  const groupStyle = getGroupStyle(configuredGroupStyle, keyDefinitions)
  const isRamp = groupStyle === RAMP
  const hasStroke = isRamp &&
    keyDefinitions.some(keyDefinition => getValueForStyle(keyDefinition.style?.stroke, mapStyle.id))
  const orientation = useRampOrientation(listRef, keyDefinitions.map(keyDefinition => keyDefinition.label ?? ''), isRamp, hasStroke)
  const className = getListClassName(groupStyle, orientation, hasStroke)
  return (
    <section className='im-c-map-key__group' aria-labelledby={headingId}>
      <h3 id={headingId} className='im-c-map-key__group-heading'>{label}</h3>
      <dl ref={listRef} className={className}>
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
