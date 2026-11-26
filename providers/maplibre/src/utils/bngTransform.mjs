// British National Grid (EPSG:27700): lng/lat (WGS84) to eastings and northings and back. The
// same calculation as proj4 with the EPSG:27700 definition: transverse Mercator on the Airy 1830
// ellipsoid, with the 7-parameter Helmert transform to WGS84 (accurate to a few metres).
//
// This file is also the script MapLibre loads into its workers, so it has no imports and sets the
// workers' projection handler when it runs there.

const SECONDS_TO_RADIANS = Math.PI / (180 * 3600)
const DEGREES_TO_RADIANS = Math.PI / 180

const AIRY = { a: 6377563.396, b: 6356256.91 }
const WGS84 = { a: 6378137, b: 6378137 * (1 - 1 / 298.257223563) }

const ORIGIN_LATITUDE = 49 * DEGREES_TO_RADIANS
const CENTRAL_MERIDIAN = -2 * DEGREES_TO_RADIANS
const SCALE_FACTOR = 0.9996012717
const FALSE_EASTING = 400000
const FALSE_NORTHING = -100000

// Airy 1830 to WGS84: shifts in metres, rotations in seconds of arc and scale in parts per million
const HELMERT = {
  dx: 446.448,
  dy: -125.157,
  dz: 542.06,
  rx: 0.15 * SECONDS_TO_RADIANS,
  ry: 0.247 * SECONDS_TO_RADIANS,
  rz: 0.842 * SECONDS_TO_RADIANS,
  scale: 1 + -20.489 / 1e6
}

const eccentricitySquared = ({ a, b }) => 1 - (b * b) / (a * a)

const toGeocentric = ([lng, lat], ellipsoid) => {
  const e2 = eccentricitySquared(ellipsoid)
  const sinLat = Math.sin(lat)
  const primeVertical = ellipsoid.a / Math.sqrt(1 - e2 * sinLat * sinLat)
  return [
    primeVertical * Math.cos(lat) * Math.cos(lng),
    primeVertical * Math.cos(lat) * Math.sin(lng),
    primeVertical * (1 - e2) * sinLat
  ]
}

const fromGeocentric = ([x, y, z], ellipsoid) => {
  const e2 = eccentricitySquared(ellipsoid)
  const distanceFromAxis = Math.hypot(x, y)
  let lat = Math.atan2(z, distanceFromAxis * (1 - e2))
  for (let step = 0; step < 10; step++) {
    const sinLat = Math.sin(lat)
    const primeVertical = ellipsoid.a / Math.sqrt(1 - e2 * sinLat * sinLat)
    const height = distanceFromAxis / Math.cos(lat) - primeVertical
    const nextLat = Math.atan2(z, distanceFromAxis * (1 - e2 * primeVertical / (primeVertical + height)))
    const change = Math.abs(nextLat - lat)
    lat = nextLat
    if (change < 1e-12) {
      break
    }
  }
  return [Math.atan2(y, x), lat]
}

const airyToWgs84 = ([x, y, z]) => {
  const { dx, dy, dz, rx, ry, rz, scale } = HELMERT
  return [
    scale * (x - rz * y + ry * z) + dx,
    scale * (rz * x + y - rx * z) + dy,
    scale * (-ry * x + rx * y + z) + dz
  ]
}

const wgs84ToAiry = ([x, y, z]) => {
  const { dx, dy, dz, rx, ry, rz, scale } = HELMERT
  const shiftedX = (x - dx) / scale
  const shiftedY = (y - dy) / scale
  const shiftedZ = (z - dz) / scale
  return [
    shiftedX + rz * shiftedY - ry * shiftedZ,
    -rz * shiftedX + shiftedY + rx * shiftedZ,
    ry * shiftedX - rx * shiftedY + shiftedZ
  ]
}

// Transverse Mercator by Krüger's series to the sixth order (Karney 2011), accurate to well under a
// millimetre across the whole OS grid
const eccentricity = Math.sqrt(eccentricitySquared(AIRY))
const n = (AIRY.a - AIRY.b) / (AIRY.a + AIRY.b)
const [n2, n3, n4, n5, n6] = [2, 3, 4, 5, 6].map(power => n ** power)
const rectifyingRadius = AIRY.a / (1 + n) * (1 + n2 / 4 + n4 / 64 + n6 / 256)

const ALPHA = [
  n / 2 - 2 * n2 / 3 + 5 * n3 / 16 + 41 * n4 / 180 - 127 * n5 / 288 + 7891 * n6 / 37800,
  13 * n2 / 48 - 3 * n3 / 5 + 557 * n4 / 1440 + 281 * n5 / 630 - 1983433 * n6 / 1935360,
  61 * n3 / 240 - 103 * n4 / 140 + 15061 * n5 / 26880 + 167603 * n6 / 181440,
  49561 * n4 / 161280 - 179 * n5 / 168 + 6601661 * n6 / 7257600,
  34729 * n5 / 80640 - 3418889 * n6 / 1995840,
  212378941 * n6 / 319334400
]

const BETA = [
  n / 2 - 2 * n2 / 3 + 37 * n3 / 96 - n4 / 360 - 81 * n5 / 512 + 96199 * n6 / 604800,
  n2 / 48 + n3 / 15 - 437 * n4 / 1440 + 46 * n5 / 105 - 1118711 * n6 / 3870720,
  17 * n3 / 480 - 37 * n4 / 840 - 209 * n5 / 4480 + 5569 * n6 / 90720,
  4397 * n4 / 161280 - 11 * n5 / 504 - 830251 * n6 / 7257600,
  4583 * n5 / 161280 - 108847 * n6 / 3991680,
  20648693 * n6 / 638668800
]

// The tangent of the conformal latitude
const conformalTangent = (lat) => {
  const tangent = Math.tan(lat)
  const sigma = Math.sinh(eccentricity * Math.atanh(eccentricity * tangent / Math.hypot(1, tangent)))
  return tangent * Math.hypot(1, sigma) - sigma * Math.hypot(1, tangent)
}

// Adds (sign 1) or removes (sign -1) the series terms between the sphere and the ellipsoid
const applySeries = (xi, eta, coefficients, sign) => coefficients.reduce(([sumXi, sumEta], coefficient, index) => {
  const multiple = 2 * (index + 1)
  return [
    sumXi + sign * coefficient * Math.sin(multiple * xi) * Math.cosh(multiple * eta),
    sumEta + sign * coefficient * Math.cos(multiple * xi) * Math.sinh(multiple * eta)
  ]
}, [xi, eta])

const originXi = applySeries(Math.atan(conformalTangent(ORIGIN_LATITUDE)), 0, ALPHA, 1)[0]

const project = ([lng, lat]) => {
  const longitude = lng - CENTRAL_MERIDIAN
  const tangent = conformalTangent(lat)
  const sphereXi = Math.atan2(tangent, Math.cos(longitude))
  const sphereEta = Math.atanh(Math.sin(longitude) / Math.hypot(1, tangent))
  const [xi, eta] = applySeries(sphereXi, sphereEta, ALPHA, 1)
  return [
    FALSE_EASTING + SCALE_FACTOR * rectifyingRadius * eta,
    FALSE_NORTHING + SCALE_FACTOR * rectifyingRadius * (xi - originXi)
  ]
}

// The latitude whose conformal latitude has this tangent, by Newton's method
const latitudeFromConformalTangent = (target) => {
  const e2 = eccentricity * eccentricity
  let tangent = target
  for (let step = 0; step < 10; step++) {
    const estimate = conformalTangent(Math.atan(tangent))
    const change = (target - estimate) / Math.hypot(1, estimate) *
      (1 + (1 - e2) * tangent * tangent) / ((1 - e2) * Math.hypot(1, tangent))
    tangent += change
    if (Math.abs(change) < 1e-14) {
      break
    }
  }
  return Math.atan(tangent)
}

const unproject = ([easting, northing]) => {
  const xi = (northing - FALSE_NORTHING) / (SCALE_FACTOR * rectifyingRadius) + originXi
  const eta = (easting - FALSE_EASTING) / (SCALE_FACTOR * rectifyingRadius)
  const [sphereXi, sphereEta] = applySeries(xi, eta, BETA, -1)
  const tangent = Math.sin(sphereXi) / Math.hypot(Math.sinh(sphereEta), Math.cos(sphereXi))
  return [
    CENTRAL_MERIDIAN + Math.atan2(Math.sinh(sphereEta), Math.cos(sphereXi)),
    latitudeFromConformalTangent(tangent)
  ]
}

/**
 * @param {number[]} position - [lng, lat] in degrees (WGS84).
 * @returns {number[]} [easting, northing] in metres.
 */
export const forward = ([lng, lat]) => {
  const wgs84 = toGeocentric([lng * DEGREES_TO_RADIANS, lat * DEGREES_TO_RADIANS], WGS84)
  return project(fromGeocentric(wgs84ToAiry(wgs84), AIRY))
}

/**
 * @param {number[]} position - [easting, northing] in metres.
 * @returns {number[]} [lng, lat] in degrees (WGS84).
 */
export const inverse = (position) => {
  const airy = toGeocentric(unproject(position), AIRY)
  const [lng, lat] = fromGeocentric(airyToWgs84(airy), WGS84)
  return [lng / DEGREES_TO_RADIANS, lat / DEGREES_TO_RADIANS]
}

// In a MapLibre worker, so GeoJSON sources on a 27700 map are projected too
globalThis.setProjectionHandler?.(() => ({ forward, inverse }))
