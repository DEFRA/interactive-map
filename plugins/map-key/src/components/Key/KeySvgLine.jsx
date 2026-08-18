import { useEffect, useState } from 'react'
import { svgProps, SVG_SIZE, SVG_CENTER } from './svgProperties.js'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'

export const KeySvgLine = ({ mapStyle, keyDefinition }) => {
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [stroke, setStroke] = useState('#ff0000')

  useEffect(() => {
    const { style } = keyDefinition
    setStrokeWidth(style.strokeWidth)
    setStroke(getValueForStyle(style.stroke, mapStyle.id))
  }, [mapStyle.id, keyDefinition])

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
