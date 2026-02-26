function getGeometryShape(geometry, tol = 1e-6) {
  const dist = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1)
  const dot = ([x1, y1], [x2, y2]) => x1 * x2 + y1 * y2

  // unsupported or invalid input
  if (geometry?.type !== 'Polygon') {
    return 'unknown'
  }

  const ring = geometry.coordinates?.[0]
  if (!ring || ring.length < 4) {
    return 'unknown'
  }

  // closure check if polygon is explicitly closed (first = last)
  const closed = dist(ring[0], ring[ring.length - 1]) <= tol
  const pts = closed ? ring.slice(0, -1) : ring

  // square detection requires exactly 4 corners
  if (pts.length === 4) {
    const side = dist(pts[0], pts[1])
    const equalSides = pts.every((p, i) => 
      Math.abs(dist(p, pts[(i + 1) % 4]) - side) <= tol
    )

    const rightAngles = pts.every((p, i) => {
      const prev = pts[(i + 3) % 4]
      const next = pts[(i + 1) % 4]
      const v1 = [prev[0] - p[0], prev[1] - p[1]]
      const v2 = [next[0] - p[0], next[1] - p[1]]
      return Math.abs(dot(v1, v2)) <= tol
    })

    if (equalSides && rightAngles) {
      return 'square'
    }
  }

  // fallback
  return 'polygon'
}

function getQueryParam (name, defaultValue = null) {
  const value = new URLSearchParams(window.location.search).get(name)
  return value === null ? defaultValue : value
}

function setQueryParam (key, value) {
  const url = new URL(window.location.href)
  const params = url.searchParams

  if (value === null || value === undefined || value === "") {
    params.delete(key)
  } else {
    params.set(key, value)
  }

  // Update the URL without reloading
  window.history.replaceState({}, '', url.toString())
}

export {
  getGeometryShape,
  getQueryParam,
  setQueryParam
}