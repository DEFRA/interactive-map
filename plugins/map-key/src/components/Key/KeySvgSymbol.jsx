import { getSymbolStyleColors, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { svgSymbolProps, SVG_SIZE, SVG_SYMBOL_SIZE } from './svgProperties.js'
import { symbolRegistry } from '../../registry/index.js'

export const KeySvgSymbol = ({ keyDefinition, mapStyle, symbolDef }) => {
  const { style } = keyDefinition
  const mapColorScheme = mapStyle?.appColorScheme ?? 'light'
  const keyMapStyle = { ...mapStyle, mapColorScheme }
  const resolvedSvg = symbolRegistry.resolve(symbolDef, getSymbolStyleColors(style), keyMapStyle)
  const viewBox = getSymbolViewBox(style, symbolDef)

  if (!(resolvedSvg && viewBox)) {
    return null
  }

  // Fixed width, height from the viewBox aspect ratio — so a taller symbol (e.g. pin's tail)
  // isn't shrunk to fit a square. Negative vertical margins keep the row's layout height at
  // SVG_SIZE regardless of the symbol's height.
  const [,, viewBoxWidth, viewBoxHeight] = viewBox.split(' ').map(Number)
  const height = SVG_SYMBOL_SIZE * viewBoxHeight / viewBoxWidth
  const marginBlock = `${(SVG_SIZE - height) / 2}px`

  return (
    <svg {...svgSymbolProps} height={height} viewBox={viewBox} style={{ marginTop: marginBlock, marginBottom: marginBlock }}>
      <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
    </svg>
  )
}
