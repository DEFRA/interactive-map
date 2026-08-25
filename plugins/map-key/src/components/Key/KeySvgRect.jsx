import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'
import { svgProps, SVG_SIZE } from './svgProperties.js'

export const KeySvgRect = ({ mapStyle, keyDefinition }) => {
  const { style } = keyDefinition
  const strokeWidth = style.strokeWidth
  const fill = getValueForStyle(style.fill, mapStyle.id)
  const stroke = getValueForStyle(style.stroke, mapStyle.id)

  return (
    <svg {...svgProps}>
      <rect
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={SVG_SIZE - strokeWidth}
        height={SVG_SIZE - strokeWidth}
        rx={strokeWidth}
        ry={strokeWidth}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
      />
    </svg>
  )
}
