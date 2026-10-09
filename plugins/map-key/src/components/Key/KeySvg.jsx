import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
import { KeySvgLine } from './KeySvgLine.jsx'
import { KeySvgRect } from './KeySvgRect.jsx'
import { KeySvgRamp } from './KeySvgRamp.jsx'
import { RAMP } from '../../utils/groupStyles.js'

// Pure derivation of keyDefinition — computed directly during render (see KeyItem.jsx for why:
// staging this through useState/useEffect meant every fresh mount painted a blank symbol first).

const getSymbolShape = (keyDefinition, groupStyle, mapStyle, symbolRegistry) => {
  if (!keyDefinition) {
    return { symbolShape: null, keySymbol: null }
  }
  const { hasSymbol, hasPattern, style } = keyDefinition
  if (groupStyle === RAMP) {
    return { symbolShape: RAMP, keySymbol: null }
  }
  if (hasSymbol) {
    const keySymbol = symbolRegistry.getKeySymbol(style, mapStyle)
    return { symbolShape: keySymbol ? 'symbol' : 'rect', keySymbol }
  }
  if (hasPattern) {
    return { symbolShape: 'pattern', keySymbol: null }
  }
  // Inferred from the style: a stroke with no fill at all is a line; any fill — including
  // 'transparent' or 'none', for an outline-only shape — is a shape.
  if (style.fill == null && style.stroke) {
    return { symbolShape: 'line', keySymbol: null }
  }
  return { symbolShape: 'rect', keySymbol: null }
}

export const KeySvg = ({ keyDefinition, groupStyle, mapStyle, symbolRegistry, patternRegistry }) => {
  const { symbolShape, keySymbol } = getSymbolShape(keyDefinition, groupStyle, mapStyle, symbolRegistry)

  if (!symbolShape) {
    return null
  } else if (symbolShape === 'symbol') {
    return <KeySvgSymbol keySymbol={keySymbol} />
  } else if (symbolShape === 'pattern') {
    return <KeySvgPattern mapStyle={mapStyle} keyDefinition={keyDefinition} patternRegistry={patternRegistry} />
  } else if (symbolShape === 'line') {
    return <KeySvgLine mapStyle={mapStyle} keyDefinition={keyDefinition} />
  } else if (symbolShape === RAMP) {
    return <KeySvgRamp mapStyle={mapStyle} keyDefinition={keyDefinition} patternRegistry={patternRegistry} />
  } else {
    return <KeySvgRect mapStyle={mapStyle} keyDefinition={keyDefinition} />
  }
}
