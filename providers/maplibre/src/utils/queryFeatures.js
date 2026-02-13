/**
 * Calculates the squared distance from a point (p) to a line segment (v to w).
 */
const distToSegmentSquared = (p, v, w) => {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2
  if (l2 === 0) {
    return (p.x - v.x) ** 2 + (p.y - v.y) ** 2
  }
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
  t = Math.max(0, Math.min(1, t))
  return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2
}

/**
 * Ray-casting algorithm to determine if a point is inside a polygon.
 */
const isPointInPolygon = (point, ring) => {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const isAboveI = yi > py
    const isAboveJ = yj > py
    if (isAboveI !== isAboveJ) {
      const intersectX = (xj - xi) * (py - yi) / (yj - yi) + xi
      if (px < intersectX) {
        if (inside === true) {
          inside = false
        } else {
          inside = true
        }
      }
    }
  }
  return inside
}

/**
 * Calculates minimum squared pixel distance to the geometry.
 */
const getMinDistToGeometry = (map, point, geometry) => {
  const { coordinates: coords, type } = geometry
  let minSqDist = Infinity
  const getScreenPt = (lngLat) => map.project(lngLat)
  
  const processLine = (lineCoords) => {
    for (let i = 0; i < lineCoords.length - 1; i++) {
      const d2 = distToSegmentSquared(point, getScreenPt(lineCoords[i]), getScreenPt(lineCoords[i + 1]))
      if (d2 < minSqDist) {
        minSqDist = d2
      }
    }
  }
  
  if (type === 'Point') {
    const p = getScreenPt(coords)
    minSqDist = (point.x - p.x) ** 2 + (point.y - p.y) ** 2
  } else if (type === 'LineString' || type === 'MultiPoint') {
    if (type === 'LineString') {
      processLine(coords)
    } else {
      coords.forEach((pt) => {
        const p = getScreenPt(pt)
        const d2 = (point.x - p.x) ** 2 + (point.y - p.y) ** 2
        if (d2 < minSqDist) {
          minSqDist = d2
        }
      })
    }
  } else if (type === 'Polygon' || type === 'MultiLineString') {
    coords.forEach(processLine)
  } else if (type === 'MultiPolygon') {
    coords.forEach((poly) => poly.forEach(processLine))
  }
  return minSqDist
}

/**
 * Query features prioritizing Layer Order, then Containment for Polygons.
 */
export const queryFeatures = (map, point, options = {}) => {
  const { radius = 10 } = options
  const queryArea = [[point.x - radius, point.y - radius], [point.x + radius, point.y + radius]]
  const rawFeatures = map.queryRenderedFeatures(queryArea)
  if (rawFeatures.length === 0) {
    return []
  }

  // Identify layer visual hierarchy
  const layerStack = []
  rawFeatures.forEach(f => {
    if (layerStack.includes(f.layer.id) === false) {
      layerStack.push(f.layer.id)
    }
  })

  // Deduplicate Bottom-Up to favor data layers over highlight layers
  const seenIds = new Set()
  const uniqueFeatures = []
  for (let i = rawFeatures.length - 1; i >= 0; i--) {
    const f = rawFeatures[i]
    const featureId = f.id !== undefined ? f.id : JSON.stringify(f.properties)
    if (seenIds.has(featureId) === false) {
      seenIds.add(featureId)
      uniqueFeatures.push(f)
    }
  }

  const clickLngLat = map.unproject(point)
  const clickPt = [clickLngLat.lng, clickLngLat.lat]

  return uniqueFeatures
    .map((f) => {
      let score = 0
      const type = f.geometry.type
      const pixelDistSq = getMinDistToGeometry(map, point, f.geometry)
      
      // PRIORITY 1: LAYER ORDER
      const layerRank = layerStack.indexOf(f.layer.id)
      score += (layerRank * 1000000)

      // PRIORITY 2: CONTAINMENT (Polygon Special Treatment)
      if (type.includes('Polygon')) {
        const polys = type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
        const isInside = polys.some((ring) => isPointInPolygon(clickPt, ring[0]))
        
        if (isInside === true) {
          // Massive boost for polygons if we are actually inside them
          score -= 500000 
        } else {
          // If we are outside a polygon, it loses significantly to anything we ARE inside
          score += 100000 
        }
      }

      // PRIORITY 3: DISTANCE (Final Tie-breaker)
      score += pixelDistSq

      return { f, score }
    })
    .sort((a, b) => a.score - b.score)
    .map(({ f }) => f)
}