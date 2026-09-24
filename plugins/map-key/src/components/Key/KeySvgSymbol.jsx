import { getSymbolStyleColors, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { svgSymbolProps, SVG_SYMBOL_SIZE } from './svgProperties.js'
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

  // Drawn 1:1 (one viewBox unit per pixel, as on the map), centred in the key's fixed square —
  // symbols vary in size (pin's tail, triangle's width), so overflow is left visible rather than
  // shrinking the larger ones to fit.
  const [minX, minY, width, height] = viewBox.split(' ').map(Number)
  const keyViewBox = [
    minX - (SVG_SYMBOL_SIZE - width) / 2,
    minY - (SVG_SYMBOL_SIZE - height) / 2,
    SVG_SYMBOL_SIZE,
    SVG_SYMBOL_SIZE
  ].join(' ')

  return (
    <svg {...svgSymbolProps} viewBox={keyViewBox} overflow='visible'>
      <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
    </svg>
  )
}
