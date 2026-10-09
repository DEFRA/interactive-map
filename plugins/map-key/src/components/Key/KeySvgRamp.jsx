import { useId } from 'react'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'

// Matches the 2px border and 16×16 tile inset of the standard pattern key symbol.
const BORDER_WIDTH = 2
const PATTERN_TILE_SIZE = 16

// No viewBox: the band stretches to its column's width, and a viewBox would scale the
// pattern tile and stroke with it. Shapes and userSpaceOnUse tiles resolve in real pixels.
export const KeySvgRamp = ({ mapStyle, keyDefinition, patternRegistry }) => {
  const { style, hasPattern } = keyDefinition
  const patternId = 'im-c-map-key-ramp-' + useId().replace(/[^\w-]/g, '')
  const paths = hasPattern ? patternRegistry.getKeyPatternPaths(style, mapStyle.id) : null
  const stroke = getValueForStyle(style.stroke, mapStyle.id)
  const fill = paths ? `url(#${patternId})` : getValueForStyle(style.fill, mapStyle.id)

  return (
    <svg xmlns='http://www.w3.org/2000/svg' className='im-c-map-key-symbol' aria-hidden='true' focusable='false'>
      {paths && (
        <defs>
          <pattern
            id={patternId}
            patternUnits='userSpaceOnUse'
            x={BORDER_WIDTH}
            y={BORDER_WIDTH}
            width={PATTERN_TILE_SIZE}
            height={PATTERN_TILE_SIZE}
            dangerouslySetInnerHTML={{ __html: paths.content }}
          />
        </defs>
      )}
      {/* The stroke is drawn at double width on a flush rect; the svg clips the outer half */}
      <rect
        width='100%'
        height='100%'
        fill={fill || 'none'}
        stroke={stroke}
        strokeWidth={stroke ? BORDER_WIDTH * 2 : undefined}
      />
    </svg>
  )
}
