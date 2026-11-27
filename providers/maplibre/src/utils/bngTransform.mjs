// British National Grid (EPSG:27700): lng/lat (WGS84) to eastings and northings and back. The
// same calculation as proj4 with the EPSG:27700 definition: transverse Mercator on the Airy 1830
// ellipsoid, with the 7-parameter Helmert transform to WGS84 (accurate to a few metres).
//
// This file is also the script MapLibre loads into its workers, so it has no imports and sets the
// workers' projection handler when it runs there.

const SECONDS_TO_RADIANS = Math.PI / (180 * 3600) // NOSONAR - 180 degrees of 3600 seconds of arc
const DEGREES_TO_RADIANS = Math.PI / 180 // NOSONAR - 180 degrees in π radians

const createEllipsoid = (semiMajorAxis, semiMinorAxis) => ({
  semiMajorAxis,
  eccentricitySquared: 1 - (semiMinorAxis * semiMinorAxis) / (semiMajorAxis * semiMajorAxis)
})
const AIRY = createEllipsoid(6377563.396, 6356256.91) // NOSONAR - Airy 1830 semi-axes in metres
const WGS84 = createEllipsoid(6378137, 6378137 * (1 - 1 / 298.257223563)) // NOSONAR - WGS84 semi-major axis and inverse flattening

const ORIGIN_LATITUDE = 49 * DEGREES_TO_RADIANS // NOSONAR - latitude of true origin, 49°N
const CENTRAL_MERIDIAN = -2 * DEGREES_TO_RADIANS // NOSONAR - central meridian, 2°W
const SCALE_FACTOR = 0.9996012717
const FALSE_EASTING = 400000
const FALSE_NORTHING = -100000

// Airy 1830 to WGS84: shifts in metres, rotations in seconds of arc and scale in parts per million
const [SHIFT_X, SHIFT_Y, SHIFT_Z] = [446.448, -125.157, 542.06] // NOSONAR - Helmert shift, metres
const [ROTATION_X, ROTATION_Y, ROTATION_Z] = [0.15, 0.247, 0.842].map(seconds => seconds * SECONDS_TO_RADIANS) // NOSONAR - Helmert rotation, seconds of arc
const HELMERT_SCALE = 1 - 20.489 / 1e6 // NOSONAR - Helmert scale, parts per million

// Math.hypot is several times slower, and these values can't overflow
const hypot = (first, second) => Math.sqrt(first * first + second * second) // NOSONAR

const toGeocentric = ([lng, lat], { semiMajorAxis, eccentricitySquared }) => {
  const sinLat = Math.sin(lat)
  const primeVertical = semiMajorAxis / Math.sqrt(1 - eccentricitySquared * sinLat * sinLat)
  const distanceFromAxis = primeVertical * Math.cos(lat)
  return [
    distanceFromAxis * Math.cos(lng),
    distanceFromAxis * Math.sin(lng),
    primeVertical * (1 - eccentricitySquared) * sinLat
  ]
}

// Vermeille's exact closed form (2011), rather than iterating. The terms are named after p, q, r,
// s, t, u, v, w, k and D in the paper.
const fromGeocentric = ([geocentricX, geocentricY, geocentricZ], { semiMajorAxis, eccentricitySquared }) => {
  const eccentricityFourth = eccentricitySquared * eccentricitySquared
  const distanceFromAxis = hypot(geocentricX, geocentricY)
  const pTerm = (distanceFromAxis * distanceFromAxis) / (semiMajorAxis * semiMajorAxis)
  const qTerm = (1 - eccentricitySquared) * geocentricZ * geocentricZ / (semiMajorAxis * semiMajorAxis)
  const rTerm = (pTerm + qTerm - eccentricityFourth) / 6 // NOSONAR - Vermeille's formula
  const sTerm = eccentricityFourth * pTerm * qTerm / (4 * rTerm * rTerm * rTerm) // NOSONAR - Vermeille's formula
  const tTerm = Math.cbrt(1 + sTerm + Math.sqrt(sTerm * (2 + sTerm))) // NOSONAR - Vermeille's formula
  const uTerm = rTerm * (1 + tTerm + 1 / tTerm)
  const vTerm = Math.sqrt(uTerm * uTerm + eccentricityFourth * qTerm)
  const wTerm = eccentricitySquared * (uTerm + vTerm - qTerm) / (2 * vTerm) // NOSONAR - Vermeille's formula
  const kTerm = Math.sqrt(uTerm + vTerm + wTerm * wTerm) - wTerm
  const dTerm = kTerm * distanceFromAxis / (kTerm + eccentricitySquared)
  return [
    Math.atan2(geocentricY, geocentricX),
    2 * Math.atan2(geocentricZ, dTerm + hypot(dTerm, geocentricZ)) // NOSONAR - Vermeille's formula
  ]
}

// The Helmert rotation, for these small angles; the negated angles rotate back
const rotate = (pointX, pointY, pointZ, rotationX, rotationY, rotationZ) => [
  pointX - rotationZ * pointY + rotationY * pointZ,
  rotationZ * pointX + pointY - rotationX * pointZ,
  -rotationY * pointX + rotationX * pointY + pointZ
]

const airyToWgs84 = ([pointX, pointY, pointZ]) => {
  const [rotatedX, rotatedY, rotatedZ] = rotate(pointX, pointY, pointZ, ROTATION_X, ROTATION_Y, ROTATION_Z)
  return [HELMERT_SCALE * rotatedX + SHIFT_X, HELMERT_SCALE * rotatedY + SHIFT_Y, HELMERT_SCALE * rotatedZ + SHIFT_Z]
}

const wgs84ToAiry = ([pointX, pointY, pointZ]) =>
  rotate((pointX - SHIFT_X) / HELMERT_SCALE, (pointY - SHIFT_Y) / HELMERT_SCALE, (pointZ - SHIFT_Z) / HELMERT_SCALE, -ROTATION_X, -ROTATION_Y, -ROTATION_Z)

// Transverse Mercator by Krüger's series to the sixth order (Karney 2011), accurate to a few
// nanometres across the whole OS grid. n1 to n6 are the powers of the ellipsoid's third flattening.
const eccentricity = Math.sqrt(AIRY.eccentricitySquared)
const n1 = AIRY.eccentricitySquared / (1 + Math.sqrt(1 - AIRY.eccentricitySquared)) ** 2 // NOSONAR - third flattening
const [n2, n3, n4, n5, n6] = [2, 3, 4, 5, 6].map(power => n1 ** power) // NOSONAR - powers 2 to 6 of the third flattening
const rectifyingRadius = AIRY.semiMajorAxis / (1 + n1) * (1 + n2 / 4 + n4 / 64 + n6 / 256) // NOSONAR - rectifying radius series
const SCALED_RADIUS = SCALE_FACTOR * rectifyingRadius

const ALPHA = [
  n1 / 2 - 2 * n2 / 3 + 5 * n3 / 16 + 41 * n4 / 180 - 127 * n5 / 288 + 7891 * n6 / 37800, // NOSONAR - Krüger series coefficient α1
  13 * n2 / 48 - 3 * n3 / 5 + 557 * n4 / 1440 + 281 * n5 / 630 - 1983433 * n6 / 1935360, // NOSONAR - Krüger series coefficient α2
  61 * n3 / 240 - 103 * n4 / 140 + 15061 * n5 / 26880 + 167603 * n6 / 181440, // NOSONAR - Krüger series coefficient α3
  49561 * n4 / 161280 - 179 * n5 / 168 + 6601661 * n6 / 7257600, // NOSONAR - Krüger series coefficient α4
  34729 * n5 / 80640 - 3418889 * n6 / 1995840, // NOSONAR - Krüger series coefficient α5
  212378941 * n6 / 319334400 // NOSONAR - Krüger series coefficient α6
]

// Conformal latitude to latitude
const CONFORMAL_TO_LATITUDE = [
  2 * n1 - 2 * n2 / 3 - 2 * n3 + 116 * n4 / 45 + 26 * n5 / 45 - 2854 * n6 / 675, // NOSONAR - conformal latitude series coefficient 1
  7 * n2 / 3 - 8 * n3 / 5 - 227 * n4 / 45 + 2704 * n5 / 315 + 2323 * n6 / 945, // NOSONAR - conformal latitude series coefficient 2
  56 * n3 / 15 - 136 * n4 / 35 - 1262 * n5 / 105 + 73814 * n6 / 2835, // NOSONAR - conformal latitude series coefficient 3
  4279 * n4 / 630 - 332 * n5 / 35 - 399572 * n6 / 14175, // NOSONAR - conformal latitude series coefficient 4
  4174 * n5 / 315 - 144838 * n6 / 6237, // NOSONAR - conformal latitude series coefficient 5
  601676 * n6 / 22275 // NOSONAR - conformal latitude series coefficient 6
]

const BETA = [
  n1 / 2 - 2 * n2 / 3 + 37 * n3 / 96 - n4 / 360 - 81 * n5 / 512 + 96199 * n6 / 604800, // NOSONAR - Krüger series coefficient β1
  n2 / 48 + n3 / 15 - 437 * n4 / 1440 + 46 * n5 / 105 - 1118711 * n6 / 3870720, // NOSONAR - Krüger series coefficient β2
  17 * n3 / 480 - 37 * n4 / 840 - 209 * n5 / 4480 + 5569 * n6 / 90720, // NOSONAR - Krüger series coefficient β3
  4397 * n4 / 161280 - 11 * n5 / 504 - 830251 * n6 / 7257600, // NOSONAR - Krüger series coefficient β4
  4583 * n5 / 161280 - 108847 * n6 / 3991680, // NOSONAR - Krüger series coefficient β5
  20648693 * n6 / 638668800 // NOSONAR - Krüger series coefficient β6
]

// The tangent of the conformal latitude, from the tangent of the latitude
const conformalTangent = (tangent) => {
  const sigma = Math.sinh(eccentricity * Math.atanh(eccentricity * tangent / hypot(1, tangent)))
  return tangent * hypot(1, sigma) - sigma * hypot(1, tangent)
}

// Adds (sign 1) or removes (sign -1) the sum of coefficient × sin(2jζ) for the complex
// ζ = xi + i·eta, by Clenshaw summation. With eta 0 it's the same sum for a real angle.
const applySeries = (xi, eta, coefficients, sign) => {
  const sin2Xi = Math.sin(2 * xi) // NOSONAR - double angle
  const cos2Xi = Math.cos(2 * xi) // NOSONAR - double angle
  const sinh2Eta = Math.sinh(2 * eta) // NOSONAR - double angle
  const cosh2Eta = Math.cosh(2 * eta) // NOSONAR - double angle
  // 2·cos(2ζ), as real and imaginary parts
  const twoCosReal = 2 * cos2Xi * cosh2Eta // NOSONAR - Clenshaw summation
  const twoCosImaginary = -2 * sin2Xi * sinh2Eta // NOSONAR - Clenshaw summation
  let real = 0
  let imaginary = 0
  let previousReal = 0
  let previousImaginary = 0
  for (let index = coefficients.length - 1; index >= 0; index--) {
    const nextReal = coefficients[index] + twoCosReal * real - twoCosImaginary * imaginary - previousReal
    const nextImaginary = twoCosReal * imaginary + twoCosImaginary * real - previousImaginary
    previousReal = real
    previousImaginary = imaginary
    real = nextReal
    imaginary = nextImaginary
  }
  // Multiplied by sin(2ζ)
  const sinReal = sin2Xi * cosh2Eta
  const sinImaginary = cos2Xi * sinh2Eta
  return [
    xi + sign * (real * sinReal - imaginary * sinImaginary),
    eta + sign * (real * sinImaginary + imaginary * sinReal)
  ]
}

const originXi = applySeries(Math.atan(conformalTangent(Math.tan(ORIGIN_LATITUDE))), 0, ALPHA, 1)[0]

const project = ([lng, lat]) => {
  const longitude = lng - CENTRAL_MERIDIAN
  const tangent = conformalTangent(Math.tan(lat))
  const sphereXi = Math.atan2(tangent, Math.cos(longitude))
  const sphereEta = Math.atanh(Math.sin(longitude) / hypot(1, tangent))
  const [xi, eta] = applySeries(sphereXi, sphereEta, ALPHA, 1)
  return [
    FALSE_EASTING + SCALED_RADIUS * eta,
    FALSE_NORTHING + SCALED_RADIUS * (xi - originXi)
  ]
}

const unproject = ([easting, northing]) => {
  const xi = (northing - FALSE_NORTHING) / SCALED_RADIUS + originXi
  const eta = (easting - FALSE_EASTING) / SCALED_RADIUS
  const [sphereXi, sphereEta] = applySeries(xi, eta, BETA, -1)
  const sinhEta = Math.sinh(sphereEta)
  const cosXi = Math.cos(sphereXi)
  const conformalLatitude = Math.atan(Math.sin(sphereXi) / hypot(sinhEta, cosXi))
  return [
    CENTRAL_MERIDIAN + Math.atan2(sinhEta, cosXi),
    applySeries(conformalLatitude, 0, CONFORMAL_TO_LATITUDE, 1)[0]
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
