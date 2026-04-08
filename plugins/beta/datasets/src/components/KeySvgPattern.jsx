import { getKeyPatternPaths } from '../../../../../src/utils/patternUtils.js'
import { svgProps } from './svgProperties.js'
const PATTERN_INSET = 2

export const KeySvgPattern = (props) => {
  const { patternRegistry, mapStyle } = props

  const paths = getKeyPatternPaths(props, mapStyle.id, patternRegistry)
  return (
    <svg {...svgProps}>
      <g dangerouslySetInnerHTML={{ __html: paths.border }} />
      <g transform={`translate(${PATTERN_INSET}, ${PATTERN_INSET})`} dangerouslySetInnerHTML={{ __html: paths.content }} />
    </svg>
  )
}
