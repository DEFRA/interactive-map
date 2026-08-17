import { useEffect, useState } from 'react'
import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
import { KeySvgLine } from './KeySvgLine.jsx'
import { KeySvgRect } from './KeySvgRect.jsx'
import { symbolRegistry } from '../../registry/index.js'

export const KeySvg = ({ keyDefinition, mapStyle }) => {
  const [symbolShape, setSymbolShape] = useState(null)
  const [symbolDef, setSymbolDef] = useState(null)

  useEffect(() => {
    if (!keyDefinition) {
      setSymbolShape(null)
      return
    }
    const { hasSymbol, hasPattern, style } = keyDefinition
    if (hasSymbol) {
      const symbolDef = symbolRegistry.getSymbolDef(style)
      setSymbolDef(symbolDef)
      setSymbolShape(symbolDef ? 'symbol' : 'rect')
    } else if (hasPattern) {
      setSymbolShape('pattern')
    } else if (style.keySymbolShape === 'line') {
      setSymbolShape('line')
    } else {
      setSymbolShape('rect')
    }
  }, [keyDefinition])

  if (!symbolShape) {
    return null
  } else if (symbolShape === 'symbol') {
    return <KeySvgSymbol mapStyle={mapStyle} keyDefinition={keyDefinition} symbolDef={symbolDef} />
  } else if (symbolShape === 'pattern') {
    return <KeySvgPattern mapStyle={mapStyle} keyDefinition={keyDefinition} />
  } else if (symbolShape === 'line') {
    return <KeySvgLine mapStyle={mapStyle} keyDefinition={keyDefinition} />
  } else {
    return <KeySvgRect mapStyle={mapStyle} keyDefinition={keyDefinition} />
  }
}
