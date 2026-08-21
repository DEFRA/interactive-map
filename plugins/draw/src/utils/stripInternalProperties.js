import { SYMBOL_KEYS } from './symbolKeys.js'

// Drops adapter-derived bookkeeping from a feature before it reaches a public event:
// symbol* keys not in SYMBOL_KEYS (e.g. symbolImageId, symbolPixelRatio), and `sortKey`
// (drives fill/line/symbol-sort-key render order — see MaplibreDrawAdapter.js — never
// caller-supplied or meaningful application data).
export const stripInternalProperties = (feature) => {
  if (!feature?.properties) {
    return feature
  }
  const properties = {}
  for (const [key, value] of Object.entries(feature.properties)) {
    const isInternal = key === 'sortKey' || (key.startsWith('symbol') && !SYMBOL_KEYS.has(key))
    if (!isInternal) {
      properties[key] = value
    }
  }
  return { ...feature, properties }
}
