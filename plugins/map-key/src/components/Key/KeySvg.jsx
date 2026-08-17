import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
import { KeySvgLine } from './KeySvgLine.jsx'
import { KeySvgRect } from './KeySvgRect.jsx'
import { symbolRegistry } from '../../registry/index.js'

export const KeySvg = ({ keyDefinition, mapStyle }) => {
  const { hasSymbol, hasPattern, style } = keyDefinition
  const symbolDef = hasSymbol && symbolRegistry.getSymbolDef(style)
  if (symbolDef) {
    return <KeySvgSymbol mapStyle={mapStyle} keyDefinition={keyDefinition} symbolDef={symbolDef} />
  }

  if (hasPattern) {
    return <KeySvgPattern mapStyle={mapStyle} keyDefinition={keyDefinition} />
  }

  if (style.keySymbolShape === 'line') {
    return <KeySvgLine mapStyle={mapStyle} keyDefinition={keyDefinition} />
  }

  return <KeySvgRect mapStyle={mapStyle} keyDefinition={keyDefinition} />
}
