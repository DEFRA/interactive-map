import { useEffect, useState } from 'react'
import { getSymbolStyleColors, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { svgSymbolProps } from './svgProperties.js'
import { symbolRegistry } from '../../registry/index.js'

export const KeySvgSymbol = ({ keyDefinition, mapStyle, symbolDef }) => {
  const [resolvedSvg, setResolvedSvg] = useState(null)
  const [viewBox, setViewBox] = useState(null)

  useEffect(() => {
    const { style } = keyDefinition
    const mapColorScheme = mapStyle?.appColorScheme ?? 'light'
    const keyMapStyle = { ...mapStyle, mapColorScheme }
    setResolvedSvg(symbolRegistry.resolve(symbolDef, getSymbolStyleColors(style), keyMapStyle))
    setViewBox(getSymbolViewBox(style, symbolDef))
  }, [mapStyle, keyDefinition])

  if (!(resolvedSvg && viewBox)) {
    return null
  }

  return (
    <svg {...svgSymbolProps} viewBox={viewBox}>
      <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
    </svg>
  )
}
