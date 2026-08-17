import { useEffect, useState } from 'react'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'
import { svgProps, SVG_SIZE } from './svgProperties.js'

export const KeySvgRect = ({ mapStyle, keyDefinition }) => {
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [fill, setFill] = useState('#ff0000')
  const [stroke, setStroke] = useState('#ff0000')

  useEffect(() => {
    const { style } = keyDefinition
    setStrokeWidth(style.strokeWidth)
    setFill(getValueForStyle(style.fill, mapStyle.id))
    setStroke(getValueForStyle(style.stroke, mapStyle.id))
  }, [mapStyle.id, keyDefinition])

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
