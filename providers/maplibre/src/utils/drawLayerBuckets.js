// mapbox-gl-draw duplicates every layer into a `.cold`/`.hot` sibling pair, each backed by its
// own source — a feature moves from cold into hot the instant any of its properties change,
// only cooling back down later. Code that resolves a feature through one recorded layerId (a
// selection payload, a hover layer list) can silently stop finding it once it moves buckets —
// checking both siblings avoids that. A no-op for any other layer naming.
export const siblingDrawLayerId = (layerId) => {
  if (layerId.endsWith('.cold')) {
    return `${layerId.slice(0, -'.cold'.length)}.hot`
  }
  if (layerId.endsWith('.hot')) {
    return `${layerId.slice(0, -'.hot'.length)}.cold`
  }
  return null
}
