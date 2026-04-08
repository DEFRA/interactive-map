import { getKeyPatternPaths } from '../../../../../src/utils/patternUtils.js'

const SVG_SIZE = 20
const PATTERN_INSET = 2

export const KeySvgPattern = (props) => {
  console.log('Rendering KeySvgPattern 2')
  const { patternRegistry, mapStyle } = props
  const svgProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: SVG_SIZE,
    height: SVG_SIZE,
    viewBox: `0 0 ${SVG_SIZE} ${SVG_SIZE}`,
    className: 'am-c-datasets-key-symbol',
    'aria-hidden': 'true',
    focusable: 'false'
  }

  const paths = getKeyPatternPaths(props, mapStyle.id, patternRegistry)
  return (
    <svg {...svgProps}>
      <g dangerouslySetInnerHTML={{ __html: paths.border }} />
      <g transform={`translate(${PATTERN_INSET}, ${PATTERN_INSET})`} dangerouslySetInnerHTML={{ __html: paths.content }} />
    </svg>
  )
}
