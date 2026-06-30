/**
 * Navigate spatially from a start pixel toward a direction quadrant.
 * Returns the index of the nearest pixel in that direction.
 *
 * @param {[number, number]} start - Current pixel [x, y]
 * @param {Array<[number, number]>} pixels - All candidate pixels
 * @param {string} direction - ArrowUp | ArrowDown | ArrowLeft | ArrowRight | undefined (nearest)
 * @returns {number} Index into pixels array
 */
export const spatialNavigate = (start, pixels, direction) => {
  const quadrant = pixels.filter((p) => {
    const dx = Math.abs(p[0] - start[0])
    const dy = Math.abs(p[1] - start[1])
    let inQuadrant = false
    if (direction === 'ArrowUp') { inQuadrant = p[1] <= start[1] && dy >= dx }
    else if (direction === 'ArrowDown') { inQuadrant = p[1] > start[1] && dy >= dx }
    else if (direction === 'ArrowLeft') { inQuadrant = p[0] <= start[0] && dy < dx }
    else if (direction === 'ArrowRight') { inQuadrant = p[0] > start[0] && dy < dx }
    else { inQuadrant = true }
    return inQuadrant && JSON.stringify(p) !== JSON.stringify(start)
  })

  if (!quadrant.length) { quadrant.push(start) }

  const dist = (p) => Math.sqrt((start[0] - p[0]) ** 2 + (start[1] - p[1]) ** 2)
  const closest = quadrant.reduce((best, p) => dist(p) < dist(best) ? p : best)
  return pixels.findIndex(p => JSON.stringify(p) === JSON.stringify(closest))
}
