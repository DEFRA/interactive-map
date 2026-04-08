import { svgProps, SVG_SIZE, SVG_CENTER } from './svgProperties.js'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'

export const KeySvgLine = (props) => {
  const { mapStyle } = props
  return (
    <svg {...svgProps}>
      <line
        x1={props.strokeWidth / 2}
        y1={SVG_CENTER}
        x2={SVG_SIZE - props.strokeWidth / 2}
        y2={SVG_CENTER}
        stroke={getValueForStyle(props.stroke, mapStyle.id)}
        strokeWidth={props.strokeWidth}
        strokeLinecap='round'
      />
    </svg>
  )
}
