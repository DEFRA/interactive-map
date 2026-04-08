import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'
import { svgProps, SVG_SIZE } from './svgProperties.js'

export const KeySvgRect = (props) => {
  const { mapStyle } = props
  return (
    <svg {...svgProps}>
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
    </svg>
  )
}
