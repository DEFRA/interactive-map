import { svgProps, SVG_SIZE, SVG_CENTER } from './svgProperties.js'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'

export const KeySvgLine = ({ mapStyle, keyDefinition }) => {
  const { style } = keyDefinition
  const strokeWidth = style.strokeWidth
  const stroke = getValueForStyle(style.stroke, mapStyle.id)

  return (
    <svg {...svgProps}>
      <line
        x1={strokeWidth / 2}
        y1={SVG_CENTER}
        x2={SVG_SIZE - strokeWidth / 2}
        y2={SVG_CENTER}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
      />
    </svg>
  )
}
