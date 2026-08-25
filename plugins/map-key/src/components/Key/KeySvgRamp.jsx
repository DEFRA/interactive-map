import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'

export const KeySvgRamp = ({ mapStyle, keyDefinition }) => {
  const { style } = keyDefinition
  const fill = getValueForStyle(style.fill, mapStyle.id)
  const stroke = getValueForStyle(style.fill, mapStyle.id)

  return (
    <svg viewBox='0 0 5 5' preserveAspectRatio='none' fill={fill} stroke={stroke} stroke-width='1'>
      <path d='M0 0h5v5H0z' />
    </svg>
  )
}
