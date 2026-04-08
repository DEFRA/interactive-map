import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'
import { hasSymbol, getSymbolDef, getSymbolStyleColors, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { hasPattern, getKeyPatternPaths } from '../../../../../src/utils/patternUtils.js'

const SVG_SIZE = 20
const SVG_SYMBOL_SIZE = 38
const SVG_CENTER = SVG_SIZE / 2
const PATTERN_INSET = 2

export const KeySvgPattern = (props) => {
  const { symbolRegistry, patternRegistry, mapStyle } = props
  const appColorScheme = mapStyle?.appColorScheme ?? 'light'
  const keyMapStyle = mapStyle ? { ...mapStyle, mapColorScheme: appColorScheme } : mapStyle
  const svgProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: hasSymbol(props) ? SVG_SYMBOL_SIZE : SVG_SIZE,
    height: hasSymbol(props) ? SVG_SYMBOL_SIZE : SVG_SIZE,
    viewBox: `0 0 ${SVG_SIZE} ${SVG_SIZE}`,
    className: `am-c-datasets-key-symbol${hasSymbol(props) ? ' am-c-datasets-key-symbol--point' : ''}`,
    'aria-hidden': 'true',
    focusable: 'false'
  }

  if (hasSymbol(props)) {
    const symbolDef = getSymbolDef(props, symbolRegistry)
    if (symbolDef) {
      const resolvedSvg = symbolRegistry.resolve(symbolDef, getSymbolStyleColors(props), keyMapStyle)
      const viewBox = getSymbolViewBox(props, symbolDef)
      return (
        <svg {...svgProps} viewBox={viewBox}>
          <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
        </svg>
      )
    }
  }

  if (hasPattern(props)) {
    const paths = getKeyPatternPaths(props, mapStyle.id, patternRegistry)
    return (
      <svg {...svgProps}>
        <g dangerouslySetInnerHTML={{ __html: paths.border }} />
        <g transform={`translate(${PATTERN_INSET}, ${PATTERN_INSET})`} dangerouslySetInnerHTML={{ __html: paths.content }} />
      </svg>
    )
  }

  return (
    <svg {...svgProps}>
      {props.keySymbolShape === 'line'
        ? (
          <line
            x1={props.strokeWidth / 2}
            y1={SVG_CENTER}
            x2={SVG_SIZE - props.strokeWidth / 2}
            y2={SVG_CENTER}
            stroke={getValueForStyle(props.stroke, mapStyle.id)}
            strokeWidth={props.strokeWidth}
            strokeLinecap='round'
          />
          )
        : (
          <rect
            x={props.strokeWidth / 2}
            y={props.strokeWidth / 2}
            width={SVG_SIZE - props.strokeWidth}
            height={SVG_SIZE - props.strokeWidth}
            rx={props.strokeWidth}
            ry={props.strokeWidth}
            fill={getValueForStyle(props.fill, mapStyle.id)}
            stroke={getValueForStyle(props.stroke, mapStyle.id)}
            strokeWidth={props.strokeWidth}
            strokeLinejoin='round'
          />
          )}
    </svg>
  )
}
