import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
import { KeySvgLine } from './KeySvgLine.jsx'
import { KeySvgRect } from './KeySvgRect.jsx'
import { KeySvgRamp } from './KeySvgRamp.jsx'
import { symbolRegistry } from '../../registry/index.js'
import { HORIZONTAL_RAMP } from '../../utils/groupStyles.js'

// Pure derivation of keyDefinition — computed directly during render (see KeyItem.jsx for why:
// staging this through useState/useEffect meant every fresh mount painted a blank symbol first).

const getSymbolShape = (keyDefinition, groupStyle) => {
  if (!keyDefinition) {
    return { symbolShape: null, symbolDef: null }
  }
  const { hasSymbol, hasPattern, style } = keyDefinition
  if (groupStyle === HORIZONTAL_RAMP) {
    return { symbolShape: HORIZONTAL_RAMP, symbolDef: null }
  }
  if (hasSymbol) {
    // Always medium in the key, whatever symbolSize the map uses
    const symbolDef = symbolRegistry.getSymbolDef({ ...style, symbolSize: 'medium' })
    return { symbolShape: symbolDef ? 'symbol' : 'rect', symbolDef }
  }
  if (hasPattern) {
    return { symbolShape: 'pattern', symbolDef: null }
  }
  // Inferred from the style: a stroke with no fill at all is a line; any fill — including
  // 'transparent' or 'none', for an outline-only shape — is a shape.
  if (style.fill == null && style.stroke) {
    return { symbolShape: 'line', symbolDef: null }
  }
  return { symbolShape: 'rect', symbolDef: null }
}

export const KeySvg = ({ keyDefinition, groupStyle, mapStyle }) => {
  const { symbolShape, symbolDef } = getSymbolShape(keyDefinition, groupStyle)

  if (!symbolShape) {
    return null
  } else if (symbolShape === 'symbol') {
    return <KeySvgSymbol mapStyle={mapStyle} keyDefinition={keyDefinition} symbolDef={symbolDef} />
  } else if (symbolShape === 'pattern') {
    return <KeySvgPattern mapStyle={mapStyle} keyDefinition={keyDefinition} />
  } else if (symbolShape === 'line') {
    return <KeySvgLine mapStyle={mapStyle} keyDefinition={keyDefinition} />
  } else if (symbolShape === HORIZONTAL_RAMP) {
    return <KeySvgRamp mapStyle={mapStyle} keyDefinition={keyDefinition} />
  } else {
    return <KeySvgRect mapStyle={mapStyle} keyDefinition={keyDefinition} />
  }
}
