import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'
import { hasSymbol } from '../../../../../src/utils/symbolUtils.js'
import { hasPattern } from '../../../../../src/utils/patternUtils.js'
import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
const SVG_SIZE = 20
const SVG_CENTER = SVG_SIZE / 2

export const KeySvg = (props) => {
  if (hasSymbol(props)) {
    console.log('Rendering KeySvgSymbol')
    return <KeySvgSymbol {...props} />
  }
  if (hasPattern(props)) {
    console.log('Rendering KeySvgPattern')
    return <KeySvgPattern {...props} />
  }
  const { mapStyle } = props
  const svgProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: SVG_SIZE,
    height: SVG_SIZE,
    viewBox: `0 0 ${SVG_SIZE} ${SVG_SIZE}`,
    className: 'am-c-datasets-key-symbol',
    'aria-hidden': 'true',
    focusable: 'false'
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
