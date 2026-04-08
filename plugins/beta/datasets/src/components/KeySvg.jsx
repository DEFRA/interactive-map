import { hasSymbol, getSymbolDef } from '../../../../../src/utils/symbolUtils.js'
import { hasPattern } from '../../../../../src/utils/patternUtils.js'
import { KeySvgPattern } from './KeySvgPattern.jsx'
import { KeySvgSymbol } from './KeySvgSymbol.jsx'
import { KeySvgLine } from './KeySvgLine.jsx'
import { KeySvgRect } from './KeySvgRect.jsx'

export const KeySvg = (props) => {
  const { symbolRegistry } = props
  const symbolDef = hasSymbol(props) && getSymbolDef(props, symbolRegistry)
  if (symbolDef) {
    return <KeySvgSymbol {...props} symbolDef={symbolDef} />
  }

  if (hasPattern(props)) {
    return <KeySvgPattern {...props} />
  }

  if (props.keySymbolShape === 'line') {
    return <KeySvgLine {...props} />
  }

  return <KeySvgRect {...props} />
}
