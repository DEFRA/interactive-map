import { svgProps, SVG_SIZE, SVG_CENTER } from '../svgProperties.js'
import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'

export const KeySvgLine = ({ mapStyle, registryDataset }) => {
  const { style } = registryDataset
  return (
    <svg {...svgProps}>
      <line
        x1={style.strokeWidth / 2}
        y1={SVG_CENTER}
        x2={SVG_SIZE - style.strokeWidth / 2}
        y2={SVG_CENTER}
        stroke={getValueForStyle(style.stroke, mapStyle.id)}
        strokeWidth={style.strokeWidth}
        strokeLinecap='round'
      />
    </svg>
  )
}
