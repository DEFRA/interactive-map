import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
import { KeySvgLine } from './KeySvgLine.jsx'
import { KeySvgRect } from './KeySvgRect.jsx'

export const KeySvg = ({ symbolRegistry, keyDefinition, mapStyle, patternRegistry }) => {
  const { hasSymbol, hasPattern, style } = keyDefinition
  const symbolDef = hasSymbol && symbolRegistry.getSymbolDef(style)
  if (symbolDef) {
    return <KeySvgSymbol mapStyle={mapStyle} keyDefinition={keyDefinition} symbolRegistry={symbolRegistry} symbolDef={symbolDef} />
  }

  if (hasPattern) {
    return <KeySvgPattern mapStyle={mapStyle} keyDefinition={keyDefinition} patternRegistry={patternRegistry} />
  }

  if (style.keySymbolShape === 'line') {
    return <KeySvgLine mapStyle={mapStyle} keyDefinition={keyDefinition} />
  }

  return <KeySvgRect mapStyle={mapStyle} keyDefinition={keyDefinition} />
}
