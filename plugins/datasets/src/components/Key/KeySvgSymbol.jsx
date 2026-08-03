import { getSymbolStyleColors, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { svgSymbolProps } from './svgProperties.js'

export const KeySvgSymbol = ({ symbolRegistry, registryDataset, mapStyle, symbolDef }) => {
  const { style } = registryDataset
  const mapColorScheme = mapStyle?.appColorScheme ?? 'light'
  const keyMapStyle = { ...mapStyle, mapColorScheme }

  const resolvedSvg = symbolRegistry.resolve(symbolDef, getSymbolStyleColors(style), keyMapStyle)
  const viewBox = getSymbolViewBox(style, symbolDef)
  return (
    <svg {...svgSymbolProps} viewBox={viewBox}>
      <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
    </svg>
  )
}
