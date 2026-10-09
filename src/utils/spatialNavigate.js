/**
 * Given a starting screen pixel and a set of candidate pixels, finds the index of the
 * candidate that's nearest to `start` in the given cardinal direction — the shared primitive
 * behind every directional "move to the next spatially-adjacent thing" interaction in this
 * codebase (map label navigation, draw/edit vertex navigation, and the map features listbox).
 *
 * Candidates are first filtered to a ~90° cone centred on the pressed direction (whichever
 * axis dominates the offset decides up/down vs left/right), then the nearest of those by
 * Euclidean distance wins. If nothing falls in that cone, `start`'s own index in `pixels` is
 * returned (a no-op move) rather than jumping somewhere the user didn't ask for.
 *
 * Previously duplicated (with subtly different tie-breaking/equality logic) between
 * providers/maplibre/src/utils/spatial.js and plugins/draw/src/utils/spatial.js —
 * consolidated here as the one canonical implementation both now import.
 *
 * @param {[number, number]} start - Current pixel [x, y].
 * @param {Array<[number, number]>} pixels - All candidate pixels, including `start` itself.
 * @param {'ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight'|undefined} direction - undefined matches every candidate (nearest overall, any direction).
 * @returns {number} Index into `pixels` of the chosen candidate.
 */
export const spatialNavigate = (start, pixels, direction) => {
  const isSamePixel = (a, b) => a[0] === b[0] && a[1] === b[1]

  const quadrant = pixels.filter((p) => {
    const offsetX = Math.abs(p[0] - start[0])
    const offsetY = Math.abs(p[1] - start[1])
    let isQuadrant = false
    if (direction === 'ArrowUp') {
      isQuadrant = p[1] <= start[1] && offsetY >= offsetX
    } else if (direction === 'ArrowDown') {
      isQuadrant = p[1] > start[1] && offsetY >= offsetX
    } else if (direction === 'ArrowLeft') {
      isQuadrant = p[0] <= start[0] && offsetY < offsetX
    } else if (direction === 'ArrowRight') {
      isQuadrant = p[0] > start[0] && offsetY < offsetX
    } else {
      isQuadrant = true
    }
    return isQuadrant && !isSamePixel(p, start)
  })

  if (!quadrant.length) {
    quadrant.push(start)
  }

  const distance = (p) => Math.hypot(start[0] - p[0], start[1] - p[1])
  const closest = quadrant.reduce((best, p) => (distance(p) < distance(best) ? p : best), quadrant[0])
  return pixels.findIndex((p) => isSamePixel(p, closest))
}
