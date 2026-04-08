import { getSymbolStyleColors, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'

const SVG_SIZE = 20
const SVG_SYMBOL_SIZE = 38

export const KeySvgSymbol = (props) => {
  console.log('Rendering KeySvgSymbol')
  const { symbolRegistry, mapStyle, symbolDef } = props
  const mapColorScheme = mapStyle?.appColorScheme ?? 'light'
  const keyMapStyle = { ...mapStyle, mapColorScheme }
  const svgProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: SVG_SYMBOL_SIZE,
    height: SVG_SYMBOL_SIZE,
    viewBox: `0 0 ${SVG_SIZE} ${SVG_SIZE}`,
    className: 'am-c-datasets-key-symbol am-c-datasets-key-symbol--point',
    'aria-hidden': 'true',
    focusable: 'false'
  }

  const resolvedSvg = symbolRegistry.resolve(symbolDef, getSymbolStyleColors(props), keyMapStyle)
  const viewBox = getSymbolViewBox(props, symbolDef)
  return (
    <svg {...svgProps} viewBox={viewBox}>
      <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
    </svg>
  )
}
