import booleanValid from '@turf/boolean-valid'
import area from '@turf/area'
import { polygon } from '@turf/helpers'

const haversine = ([lon1, lat1], [lon2, lat2]) => {
  const toRad = deg => deg * Math.PI / 180
  const R = 6371000 // meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const isNewCoordinate = (coords, tolerance = 0.01) => {
  // First coord
  if (coords[0].length <= 1) {
    return true
  }
  // Subsequent coordsmust be different
  if (coords[0].length <= 3) {
    for (let i = 0; i < coords[0].length; i++) {
      for (let j = i + 1; j < coords[0].length; j++) {
        if (haversine(coords[0][i], coords[0][j]) < tolerance) {
          return false
        }
      }
    }
  }
  return true
}

const isNewLineCoordinate = (coords, tolerance = 0.01) => {
  // First coord is always valid
  if (coords.length <= 1) {
    return true
  }
  // Check last two coords are different
  if (coords.length >= 2) {
    const last = coords[coords.length - 1]
    const secondLast = coords[coords.length - 2]
    if (haversine(last, secondLast) < tolerance) {
      return false
    }
  }
  return true
}

const isValidLineClick = (coords) => {
  // First coord is always valid
  if (coords.length <= 1) {
    return true
  }
  // Check that the new coordinate is different from the previous one
  return isNewLineCoordinate(coords)
}

const isValidClick = (coords) => {
  // Less than 4 and new coordinates
  if (coords[0].length <= 1 || isNewCoordinate(coords)) {
    return true
  }

  // Basic checks
  if (!Array.isArray(coords) || coords.length < 4) {
    return false
  }

  // Check if ring is closed
  const first = coords[0]
  const last = coords[coords.length - 1]
  const isClosed = first[0] === last[0] && first[1] === last[1]
  if (!isClosed) {
    return false
  }

  // Create a turf polygon
  const turfPoly = polygon([coords])

  // Check if geometry is valid (non-self-intersecting)
  const valid = booleanValid(turfPoly)
  if (!valid) {
    return false
  }

  // Check if area is positive
  const polyArea = area(turfPoly)
  if (polyArea <= 0) {
    return false
  }

  return true
}

const spatialNavigate = (start, pixels, direction) => {
  const quadrant = pixels.filter((p, i) => {
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
    return isQuadrant && (JSON.stringify(p) !== JSON.stringify(start))
  })

  if (!quadrant.length) {
    quadrant.push(start)
  }

  const pythagorean = (a, b) => Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))
  const distances = quadrant.map(p => pythagorean(Math.abs(start[0] - p[0]), Math.abs(start[1] - p[1])))
  const closest = quadrant[distances.indexOf(Math.min(...distances))]
  return pixels.findIndex(i => JSON.stringify(i) === JSON.stringify(closest))
}

export {
	isNewCoordinate,
	isValidClick,
	isValidLineClick,
  spatialNavigate
}