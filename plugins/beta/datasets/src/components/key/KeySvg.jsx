import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
import { KeySvgLine } from './KeySvgLine.jsx'
import { KeySvgRect } from './KeySvgRect.jsx'

export const KeySvg = ({ symbolRegistry, registryDataset, mapStyle, patternRegistry }) => {
  const { hasSymbol, hasPattern, style } = registryDataset
  const symbolDef = hasSymbol && symbolRegistry.getSymbolDef(style)
  if (symbolDef) {
    return <KeySvgSymbol mapStyle={mapStyle} registryDataset={registryDataset} symbolRegistry={symbolRegistry} symbolDef={symbolDef} />
  }

  if (hasPattern) {
    return <KeySvgPattern mapStyle={mapStyle} registryDataset={registryDataset} patternRegistry={patternRegistry} />
  }

  if (style.keySymbolShape === 'line') {
    return <KeySvgLine mapStyle={mapStyle} registryDataset={registryDataset} />
  }

  return <KeySvgRect mapStyle={mapStyle} registryDataset={registryDataset} />
}
