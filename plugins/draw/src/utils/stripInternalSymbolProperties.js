import { SYMBOL_KEYS } from './symbolKeys.js'

// Drops adapter-derived symbol* bookkeeping (e.g. symbolImageId, symbolPixelRatio) from a
// feature before it reaches a public event — anything symbol-prefixed but not in SYMBOL_KEYS.
export const stripInternalSymbolProperties = (feature) => {
  if (!feature?.properties) {
    return feature
  }
  const properties = {}
  for (const [key, value] of Object.entries(feature.properties)) {
    if (key.startsWith('symbol') && !SYMBOL_KEYS.has(key)) {
      continue
    }
    properties[key] = value
  }
  return { ...feature, properties }
}
