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
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const isAboveI = yi > py
    const isAboveJ = yj > py

    if (isAboveI === isAboveJ) {
      continue
    }
    // 2. Calculate horizontal intersection
    const intersectX = ((xj - xi) * (py - yi)) / (yj - yi) + xi

    if (px < intersectX) {
      inside = !inside
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
  } else {
    // No action
  }
  return minSqDist
}

/**
 * Query features prioritizing Layer Order, then Containment for Polygons.
 */
export const queryFeatures = (map, point, options = {}) => {
  const { radius = 10 } = options

  const bbox = [[point.x - radius, point.y - radius], [point.x + radius, point.y + radius]]
  const rawFeatures = map.queryRenderedFeatures(bbox)
  if (rawFeatures.length === 0) {
    return []
  }

  // For symbol/point features, tolerance must not apply — selection should only
  // fire when the click lands within the rendered icon bounds. An exact point
  // query uses MapLibre's own icon hit-testing, mirroring the hover cursor behaviour.
  const exactFeatureKeys = new Set(
    map.queryRenderedFeatures([point.x, point.y]).map(f => {
      const rawId = f.id === undefined ? JSON.stringify(f.properties) : f.id
      return `${f.layer?.source}:${rawId}`
    })
  )

  // Identify layer visual hierarchy
  const layerStack = []
  rawFeatures.forEach(f => {
    if (layerStack.includes(f.layer.id) === false) {
      layerStack.push(f.layer.id)
    }
  })

  // Deduplicate Bottom-Up to favor data layers over highlight layers.
  // Key includes source ID to prevent collisions between features from different
  // sources that share the same numeric ID (e.g. generateId: true resets per source).
  const seenIds = new Set()
  const uniqueFeatures = []
  for (let i = rawFeatures.length - 1; i >= 0; i--) {
    const f = rawFeatures[i]
    const rawId = f.id === undefined ? JSON.stringify(f.properties) : f.id
    const featureId = `${f.layer?.source}:${rawId}`
    if (seenIds.has(featureId) === false) {
      seenIds.add(featureId)
      uniqueFeatures.push(f)
    }
  }

  const clickLngLat = map.unproject(point)
  const clickPt = [clickLngLat.lng, clickLngLat.lat]

  // Discard features where tolerance should not apply:
  // - Polygons: only include if click is geometrically inside
  // - Points/symbols: only include if under the exact click point (respects icon bounds)
  // - Lines: allowed through — tolerance bbox is intentional for them
  const candidates = uniqueFeatures.filter((f) => {
    const type = f.geometry.type
    if (type.includes('Polygon')) {
      const polys = type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
      return polys.some((ring) => isPointInPolygon(clickPt, ring[0]))
    }
    if (type === 'Point' || type === 'MultiPoint') {
      const rawId = f.id === undefined ? JSON.stringify(f.properties) : f.id
      return exactFeatureKeys.has(`${f.layer?.source}:${rawId}`)
    }
    return true
  })

  return candidates
    .map((f) => {
      let score = 0
      const type = f.geometry.type
      const pixelDistSq = getMinDistToGeometry(map, point, f.geometry)

      // PRIORITY 1: LAYER ORDER
      const layerRank = layerStack.indexOf(f.layer.id)
      score += (layerRank * 1000000)

      // PRIORITY 2: POLYGON BOOST (already filtered to inside-only)
      if (type.includes('Polygon')) {
        score -= 500000 // NOSONAR
      }

      // PRIORITY 3: DISTANCE (Final Tie-breaker)
      score += pixelDistSq

      return { f, score }
    })
    .sort((a, b) => a.score - b.score)
    .map(({ f }) => f)
}
