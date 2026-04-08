import { getSymbolStyleColors, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { svgSymbolProps } from './svgProperties.js'

export const KeySvgSymbol = (props) => {
  const { symbolRegistry, mapStyle, symbolDef } = props
  const mapColorScheme = mapStyle?.appColorScheme ?? 'light'
  const keyMapStyle = { ...mapStyle, mapColorScheme }

  const resolvedSvg = symbolRegistry.resolve(symbolDef, getSymbolStyleColors(props), keyMapStyle)
  const viewBox = getSymbolViewBox(props, symbolDef)
  return (
    <svg {...svgSymbolProps} viewBox={viewBox}>
      <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
    </svg>
  )
}
