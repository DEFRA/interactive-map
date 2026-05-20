import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'
import { svgProps, SVG_SIZE } from '../svgProperties.js'

export const KeySvgRect = ({ mapStyle, registryDataset }) => {
  const { style } = registryDataset
  return (
    <svg {...svgProps}>
      <rect
        x={style.strokeWidth / 2}
        y={style.strokeWidth / 2}
        width={SVG_SIZE - style.strokeWidth}
        height={SVG_SIZE - style.strokeWidth}
        rx={style.strokeWidth}
        ry={style.strokeWidth}
        fill={getValueForStyle(style.fill, mapStyle.id)}
        stroke={getValueForStyle(style.stroke, mapStyle.id)}
        strokeWidth={style.strokeWidth}
        strokeLinejoin='round'
      />
    </svg>
  )
}
