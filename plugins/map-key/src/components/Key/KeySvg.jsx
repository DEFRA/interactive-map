import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
import { KeySvgLine } from './KeySvgLine.jsx'
import { KeySvgRect } from './KeySvgRect.jsx'
import { KeySvgRamp } from './KeySvgRamp.jsx'
import { symbolRegistry } from '../../registry/index.js'

// Pure derivation of keyDefinition — computed directly during render (see KeyItem.jsx for why:
// staging this through useState/useEffect meant every fresh mount painted a blank symbol first).
const getSymbolShape = (keyDefinition) => {
  if (!keyDefinition) {
    return { symbolShape: null, symbolDef: null }
  }
  const { hasSymbol, hasPattern, hasRampStyleKey, style } = keyDefinition
  if (hasRampStyleKey) {
    return { symbolShape: 'ramp', symbolDef: null }
  }
  if (hasSymbol) {
    const symbolDef = symbolRegistry.getSymbolDef(style)
    return { symbolShape: symbolDef ? 'symbol' : 'rect', symbolDef }
  }
  if (hasPattern) {
    return { symbolShape: 'pattern', symbolDef: null }
  }
  if (style.keySymbolShape === 'line') {
    return { symbolShape: 'line', symbolDef: null }
  }
  return { symbolShape: 'rect', symbolDef: null }
}

export const KeySvg = ({ keyDefinition, mapStyle }) => {
  const { symbolShape, symbolDef } = getSymbolShape(keyDefinition)

  if (!symbolShape) {
    return null
  } else if (symbolShape === 'symbol') {
    return <KeySvgSymbol mapStyle={mapStyle} keyDefinition={keyDefinition} symbolDef={symbolDef} />
  } else if (symbolShape === 'pattern') {
    return <KeySvgPattern mapStyle={mapStyle} keyDefinition={keyDefinition} />
  } else if (symbolShape === 'line') {
    return <KeySvgLine mapStyle={mapStyle} keyDefinition={keyDefinition} />
  } else if (symbolShape === 'ramp') {
    return <KeySvgRamp mapStyle={mapStyle} keyDefinition={keyDefinition} />
  } else {
    return <KeySvgRect mapStyle={mapStyle} keyDefinition={keyDefinition} />
  }
}
