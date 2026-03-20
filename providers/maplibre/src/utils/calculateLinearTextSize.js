/**
 * Calculates a simplified linear interpolated value from a MapLibre GL expression.
 * NOTE: This is an approximation if expression.base is not 1.
 * @param {object} expression - The interpolation object { base: number, stops: [[zoom, value], ...] }.
 * @param {number} zoom - The current map zoom level.
 * @returns {number} The interpolated size value.
 */
export function calculateLinearTextSize (expression, zoom) {
  const { stops } = expression

  if (stops.length < 2) {
    return stops.length > 0 ? stops[0][1] : 0
  }

  // 1. Find the bounding stops (Z0, S0) and (Z1, S1)
  let lowerStop = stops[0]
  let upperStop = stops[stops.length - 1]

  for (let i = 1; i < stops.length; i++) {
    const currentStop = stops[i]
    if (currentStop[0] > zoom) {
      upperStop = currentStop
      lowerStop = stops[i - 1]
      break
    }
    lowerStop = stops[i - 1]
    upperStop = currentStop
  }

  const [Z0, S0] = lowerStop
  const [Z1, S1] = upperStop

  // 2. Clamp the zoom level
  if (zoom <= Z0) {
    return S0
  }
  if (zoom >= Z1) {
    return S1
  }

  // 3. Perform Simple Linear Interpolation (LERP)
  // t is the proportion of the distance between Z0 and Z1 that 'zoom' has traveled.
  const t = (zoom - Z0) / (Z1 - Z0)

  // S0 + (S1 - S0) * t
  const interpolatedSize = S0 + (S1 - S0) * t

  return interpolatedSize
}
