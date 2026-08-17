import { useEffect, useState } from 'react'
import { svgProps } from './svgProperties.js'
import { patternRegistry } from '../../registry/index.js'
const PATTERN_INSET = 2

export const KeySvgPattern = ({ keyDefinition, mapStyle }) => {
  const [paths, setPaths] = useState(null)

  useEffect(() => {
    const { style } = keyDefinition
    setPaths(patternRegistry.getKeyPatternPaths(style, mapStyle.id))
  }, [mapStyle.id, keyDefinition])

  if (!paths) {
    return null
  }
  return (
    <svg {...svgProps}>
      <g dangerouslySetInnerHTML={{ __html: paths.border }} />
      <g transform={`translate(${PATTERN_INSET}, ${PATTERN_INSET})`} dangerouslySetInnerHTML={{ __html: paths.content }} />
    </svg>
  )
}
