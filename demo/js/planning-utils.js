function getGeometryShape(geometry, tol = 1e-6) {
  var dist = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1)
  var dot = ([x1, y1], [x2, y2]) => x1 * x2 + y1 * y2

  // unsupported or invalid input
  if (geometry?.type !== 'Polygon') {
    return 'unknown'
  }

  var ring = geometry.coordinates?.[0]
  if (!ring || ring.length < 4) {
    return 'unknown'
  }

  // closure check if polygon is explicitly closed (first = last)
  var closed = dist(ring[0], ring[ring.length - 1]) <= tol
  var pts = closed ? ring.slice(0, -1) : ring

  // square detection requires exactly 4 corners
  if (pts.length === 4) {
    var side = dist(pts[0], pts[1])
    var equalSides = pts.every((p, i) => 
      Math.abs(dist(p, pts[(i + 1) % 4]) - side) <= tol
    )

    var rightAngles = pts.every((p, i) => {
      var prev = pts[(i + 3) % 4]
      var next = pts[(i + 1) % 4]
      var v1 = [prev[0] - p[0], prev[1] - p[1]]
      var v2 = [next[0] - p[0], next[1] - p[1]]
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
  var value = new URLSearchParams(window.location.search).get(name)
  return value === null ? defaultValue : value
}

function setQueryParam (key, value) {
  var url = new URL(window.location.href)
  var params = url.searchParams

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