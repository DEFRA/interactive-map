import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'
import { hasSymbol, getSymbolDef } from '../../../../../src/utils/symbolUtils.js'
import { hasPattern } from '../../../../../src/utils/patternUtils.js'
import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
import { svgProps, SVG_SIZE, SVG_CENTER } from './svgProperties.js'

export const KeySvg = (props) => {
  const { symbolRegistry } = props
  const symbolDef = hasSymbol(props) && getSymbolDef(props, symbolRegistry)
  if (symbolDef) {
    return <KeySvgSymbol {...props} symbolDef={symbolDef} />
  }
  if (hasPattern(props)) {
    return <KeySvgPattern {...props} />
  }
  const { mapStyle } = props
  console.log('Rendering default:', props.keySymbolShape)
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
