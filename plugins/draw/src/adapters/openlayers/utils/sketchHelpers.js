/**
 * Coordinate-layout helpers for ol/interaction/Draw sketch geometries.
 *
 * During drawing OL keeps a trailing rubber-band coordinate, and for Polygons
 * additionally appends a copy of the first coordinate to close the ring:
 *   LineString:   [...placed, rubber_band]
 *   Polygon ring: [...placed, rubber_band, v0_closing]
 *
 * This is the single place that layout is encoded — if an OL upgrade changes
 * the Draw interaction's sketch bookkeeping, update it here.
 */
const TRAILING_COORDS = { Polygon: 2, LineString: 1 }

/** Placed vertex coordinates of an in-progress sketch geometry. */
export const getPlacedSketchCoords = (geom) => {
  const type = geom.getType()
  const coords = type === 'Polygon' ? (geom.getCoordinates()[0] ?? []) : geom.getCoordinates()
  return coords.slice(0, -TRAILING_COORDS[type])
}

/** Last vertex committed by OL's Draw interaction, or null if none placed yet. */
export const getLastPlacedSketchCoord = (geom) => getPlacedSketchCoords(geom).at(-1) ?? null
