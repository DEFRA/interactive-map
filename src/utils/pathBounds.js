// Exact bounding box of an SVG path `d` string — the area the path's outline actually covers,
// including curve and arc extremes (not their control points). Pure, so it behaves the same in
// the browser and in tests. Supports every path command, absolute and relative, implicit
// repeats, and arc flags written without separators (e.g. `a3 3 0 011 10`).

const COMMAND = /[MmLlHhVvCcSsQqTtAaZz]/
const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/y
const SEPARATORS = /[\s,]*/y
const NUMBER_START = /[-+.\d]/

// Each command's parameters, in order: 'n' a number, 'f' an arc flag (a single 0 or 1)
const PARAMETERS = {
  m: 'nn', l: 'nn', h: 'n', v: 'n', c: 'nnnnnn', s: 'nnnn', q: 'nnnn', t: 'nn', a: 'nnnffnn', z: ''
}

const NEAR_ZERO = 1e-12
const ROUNDING = 1e6 // rounds away floating-point noise, so e.g. 26 doesn't become 26.0000000001
const HALF = 0.5
const CUBIC_WEIGHT = 3 // the cubic Bézier (Bernstein) coefficient
const QUADRATIC_WEIGHT = 2 // the quadratic Bézier coefficient, also used in the quadratic formula
const DISCRIMINANT_FACTOR = 4
const FULL_TURN = Math.PI * QUADRATIC_WEIGHT
const DEGREES_PER_HALF_TURN = 180
const DEGREES_TO_RADIANS = Math.PI / DEGREES_PER_HALF_TURN

const round = (value) => Math.round(value * ROUNDING) / ROUNDING
const isNearZero = (value) => Math.abs(value) < NEAR_ZERO
const isWithinCurve = (progress) => progress > 0 && progress < 1

// ─── Parsing ──────────────────────────────────────────────────────────────────

class PathReader {
  position = 0

  constructor (pathData) {
    this.pathData = pathData
  }

  fail (expected) {
    throw new Error(`Invalid SVG path: ${expected} at position ${this.position} in "${this.pathData}"`)
  }

  skipSeparators () {
    SEPARATORS.lastIndex = this.position
    SEPARATORS.exec(this.pathData)
    this.position = SEPARATORS.lastIndex
  }

  atEnd () {
    this.skipSeparators()
    return this.position >= this.pathData.length
  }

  peek () {
    return this.pathData[this.position]
  }

  readCommand () {
    if (!COMMAND.test(this.peek())) {
      return null
    }
    const command = this.peek()
    this.position++
    return command
  }

  readNumber () {
    this.skipSeparators()
    NUMBER.lastIndex = this.position
    const match = NUMBER.exec(this.pathData)
    if (!match) {
      this.fail('expected a number')
    }
    this.position = NUMBER.lastIndex
    return Number.parseFloat(match[0])
  }

  readFlag () {
    this.skipSeparators()
    const flag = this.peek()
    if (flag !== '0' && flag !== '1') {
      this.fail('expected an arc flag (0 or 1)')
    }
    this.position++
    return Number(flag)
  }

  readParameters (command) {
    return [...PARAMETERS[command.toLowerCase()]].map((kind) => kind === 'f' ? this.readFlag() : this.readNumber())
  }
}

// Splits path data into [command, ...parameters] segments, repeating a command for each extra
// parameter set (a repeated moveto becomes a lineto, per the SVG spec).
const parsePath = (pathData) => {
  const reader = new PathReader(pathData)
  const segments = []
  let command = null
  while (!reader.atEnd()) {
    const explicitCommand = reader.readCommand()
    // Without a command letter, these must be more parameters for the previous command
    if (!explicitCommand && !(command && NUMBER_START.test(reader.peek()))) {
      reader.fail(`unexpected "${reader.peek()}"`)
    }
    command = explicitCommand ?? command
    segments.push([command, ...reader.readParameters(command)])
    // After a moveto, further coordinates are linetos; nothing can follow a closepath's (zero) parameters
    command = { M: 'L', m: 'l', Z: null, z: null }[command] ?? command
  }
  return segments
}

// ─── Curve and arc extremes ───────────────────────────────────────────────────

// Progress values (0–1 along the curve) where a cubic Bézier's coordinate on one axis turns,
// i.e. where its derivative is zero.
const cubicTurningPoints = (start, control1, control2, end) => {
  // derivative ÷ 3 = quadratic × t² + linear × t + constant
  const quadratic = -start + CUBIC_WEIGHT * control1 - CUBIC_WEIGHT * control2 + end
  const linear = QUADRATIC_WEIGHT * (start - QUADRATIC_WEIGHT * control1 + control2)
  const constant = control1 - start
  if (isNearZero(quadratic)) {
    return isNearZero(linear) ? [] : [-constant / linear]
  }
  const discriminant = linear * linear - DISCRIMINANT_FACTOR * quadratic * constant
  if (discriminant < 0) {
    return []
  }
  const root = Math.sqrt(discriminant)
  return [(-linear + root) / (QUADRATIC_WEIGHT * quadratic), (-linear - root) / (QUADRATIC_WEIGHT * quadratic)]
}

const cubicPointAt = (start, control1, control2, end, progress) => {
  const remaining = 1 - progress
  return remaining ** CUBIC_WEIGHT * start +
    CUBIC_WEIGHT * remaining ** QUADRATIC_WEIGHT * progress * control1 +
    CUBIC_WEIGHT * remaining * progress ** QUADRATIC_WEIGHT * control2 +
    progress ** CUBIC_WEIGHT * end
}

const quadTurningPoints = (start, control, end) => {
  const denominator = start - QUADRATIC_WEIGHT * control + end
  return isNearZero(denominator) ? [] : [(start - control) / denominator]
}

const quadPointAt = (start, control, end, progress) => {
  const remaining = 1 - progress
  return remaining ** QUADRATIC_WEIGHT * start + QUADRATIC_WEIGHT * remaining * progress * control + progress ** QUADRATIC_WEIGHT * end
}

const wrapAngle = (angle) => ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN

// An elliptical arc's centre and angles, per the SVG spec's endpoint-to-centre conversion —
// including scaling up radii too small to span the endpoints.
const getArcGeometry = ({ startX, startY, endX, endY, radiusX, radiusY, rotation, largeArc, sweep }) => {
  const cosRotation = Math.cos(rotation * DEGREES_TO_RADIANS)
  const sinRotation = Math.sin(rotation * DEGREES_TO_RADIANS)
  const halfDeltaX = (startX - endX) * HALF
  const halfDeltaY = (startY - endY) * HALF
  // The start point in the ellipse's own (unrotated, centred) frame
  const localX = cosRotation * halfDeltaX + sinRotation * halfDeltaY
  const localY = -sinRotation * halfDeltaX + cosRotation * halfDeltaY
  const radiusScale = Math.max(1, Math.sqrt((localX * localX) / (radiusX * radiusX) + (localY * localY) / (radiusY * radiusY)))
  const scaledRadiusX = radiusX * radiusScale
  const scaledRadiusY = radiusY * radiusScale
  const radiiProduct = scaledRadiusX * scaledRadiusX * scaledRadiusY * scaledRadiusY
  const weighted = scaledRadiusX * scaledRadiusX * localY * localY + scaledRadiusY * scaledRadiusY * localX * localX
  const direction = largeArc === sweep ? -1 : 1
  const centreFactor = direction * Math.sqrt(Math.max(0, (radiiProduct - weighted) / weighted))
  const localCentreX = centreFactor * (scaledRadiusX * localY / scaledRadiusY)
  const localCentreY = centreFactor * -(scaledRadiusY * localX / scaledRadiusX)

  const startAngle = Math.atan2((localY - localCentreY) / scaledRadiusY, (localX - localCentreX) / scaledRadiusX)
  const endAngle = Math.atan2((-localY - localCentreY) / scaledRadiusY, (-localX - localCentreX) / scaledRadiusX)
  let sweepAngle = endAngle - startAngle
  if (sweep && sweepAngle < 0) { sweepAngle += FULL_TURN }
  if (!sweep && sweepAngle > 0) { sweepAngle -= FULL_TURN }

  return {
    centreX: cosRotation * localCentreX - sinRotation * localCentreY + (startX + endX) * HALF,
    centreY: sinRotation * localCentreX + cosRotation * localCentreY + (startY + endY) * HALF,
    radiusX: scaledRadiusX,
    radiusY: scaledRadiusY,
    cosRotation,
    sinRotation,
    startAngle,
    sweepAngle
  }
}

// Points on an elliptical arc where x or y turns (the endpoints are added by the caller).
const arcTurningPoints = (arc) => {
  if (isNearZero(arc.radiusX) || isNearZero(arc.radiusY) || (arc.startX === arc.endX && arc.startY === arc.endY)) {
    return [] // a straight line, or nothing at all
  }
  const { centreX, centreY, radiusX, radiusY, cosRotation, sinRotation, startAngle, sweepAngle } = getArcGeometry(arc)
  const isOnArc = (angle) => sweepAngle >= 0
    ? wrapAngle(angle - startAngle) <= sweepAngle
    : wrapAngle(startAngle - angle) <= -sweepAngle
  const pointAt = (angle) => [
    centreX + radiusX * cosRotation * Math.cos(angle) - radiusY * sinRotation * Math.sin(angle),
    centreY + radiusX * sinRotation * Math.cos(angle) + radiusY * cosRotation * Math.sin(angle)
  ]
  // The angles where x and y turn, each with its opposite
  const xTurn = Math.atan2(-radiusY * sinRotation, radiusX * cosRotation)
  const yTurn = Math.atan2(radiusY * cosRotation, radiusX * sinRotation)
  return [xTurn, xTurn + Math.PI, yTurn, yTurn + Math.PI].filter(isOnArc).map(pointAt)
}

// ─── Tracing ──────────────────────────────────────────────────────────────────

// Follows the path's current point, widening the bounds to cover everything it draws.
class PathTracer {
  currentX = 0
  currentY = 0
  subpathStartX = 0
  subpathStartY = 0
  lastCubicControl = null // second control point of the previous C/S, for S's reflection
  lastQuadControl = null // control point of the previous Q/T, for T's reflection
  hasPoints = false
  minX = Infinity
  minY = Infinity
  maxX = -Infinity
  maxY = -Infinity

  include (pointX, pointY) {
    this.hasPoints = true
    this.minX = Math.min(this.minX, pointX)
    this.minY = Math.min(this.minY, pointY)
    this.maxX = Math.max(this.maxX, pointX)
    this.maxY = Math.max(this.maxY, pointY)
  }

  moveCurrentPoint (pointX, pointY) {
    this.currentX = pointX
    this.currentY = pointY
    this.include(pointX, pointY)
  }

  moveTo (pointX, pointY) {
    this.moveCurrentPoint(pointX, pointY)
    this.subpathStartX = pointX
    this.subpathStartY = pointY
  }

  lineTo (pointX, pointY) {
    this.moveCurrentPoint(pointX, pointY)
  }

  // The reflection of the previous control point about the current point, or the current point
  // itself if the previous segment wasn't the same kind of curve.
  reflect (previousControl) {
    return previousControl
      ? [QUADRATIC_WEIGHT * this.currentX - previousControl[0], QUADRATIC_WEIGHT * this.currentY - previousControl[1]]
      : [this.currentX, this.currentY]
  }

  cubicTo (control1X, control1Y, control2X, control2Y, endX, endY) {
    const xs = [this.currentX, control1X, control2X, endX]
    const ys = [this.currentY, control1Y, control2Y, endY]
    const progresses = [...cubicTurningPoints(...xs), ...cubicTurningPoints(...ys)].filter(isWithinCurve)
    progresses.forEach((progress) => this.include(cubicPointAt(...xs, progress), cubicPointAt(...ys, progress)))
    this.moveCurrentPoint(endX, endY)
    this.lastCubicControl = [control2X, control2Y]
  }

  quadTo (controlX, controlY, endX, endY) {
    const xs = [this.currentX, controlX, endX]
    const ys = [this.currentY, controlY, endY]
    const progresses = [...quadTurningPoints(...xs), ...quadTurningPoints(...ys)].filter(isWithinCurve)
    progresses.forEach((progress) => this.include(quadPointAt(...xs, progress), quadPointAt(...ys, progress)))
    this.moveCurrentPoint(endX, endY)
    this.lastQuadControl = [controlX, controlY]
  }

  arcTo (arc) {
    arcTurningPoints({ ...arc, startX: this.currentX, startY: this.currentY })
      .forEach(([pointX, pointY]) => this.include(pointX, pointY))
    this.moveCurrentPoint(arc.endX, arc.endY)
  }

  close () {
    this.currentX = this.subpathStartX
    this.currentY = this.subpathStartY
  }
}

// Draws one segment, given its parameters already offset to absolute coordinates where relative.
// `params` holds the raw values; `origin` is the current point for a relative command, else 0,0.
const SEGMENT_TRACERS = {
  m: (tracer, [toX, toY], [originX, originY]) => tracer.moveTo(toX + originX, toY + originY),
  l: (tracer, [toX, toY], [originX, originY]) => tracer.lineTo(toX + originX, toY + originY),
  h: (tracer, [toX], [originX]) => tracer.lineTo(toX + originX, tracer.currentY),
  v: (tracer, [toY], [, originY]) => tracer.lineTo(tracer.currentX, toY + originY),
  c: (tracer, [control1X, control1Y, control2X, control2Y, toX, toY], [originX, originY]) =>
    tracer.cubicTo(control1X + originX, control1Y + originY, control2X + originX, control2Y + originY, toX + originX, toY + originY),
  s: (tracer, [control2X, control2Y, toX, toY], [originX, originY], previous) =>
    tracer.cubicTo(...tracer.reflect(previous.cubic), control2X + originX, control2Y + originY, toX + originX, toY + originY),
  q: (tracer, [controlX, controlY, toX, toY], [originX, originY]) =>
    tracer.quadTo(controlX + originX, controlY + originY, toX + originX, toY + originY),
  t: (tracer, [toX, toY], [originX, originY], previous) =>
    tracer.quadTo(...tracer.reflect(previous.quad), toX + originX, toY + originY),
  a: (tracer, [radiusX, radiusY, rotation, largeArc, sweep, toX, toY], [originX, originY]) =>
    tracer.arcTo({ radiusX: Math.abs(radiusX), radiusY: Math.abs(radiusY), rotation, largeArc, sweep, endX: toX + originX, endY: toY + originY }),
  z: (tracer) => tracer.close()
}

/**
 * Returns the exact bounding box of an SVG path.
 *
 * @param {string} pathData - SVG path data
 * @returns {number[]} [x, y, width, height]
 * @throws {Error} if the path can't be parsed or draws nothing
 */
export const getPathBounds = (pathData) => {
  const tracer = new PathTracer()
  for (const [command, ...params] of parsePath(pathData)) {
    const lowerCommand = command.toLowerCase()
    const origin = command === lowerCommand ? [tracer.currentX, tracer.currentY] : [0, 0]
    // Only a segment immediately after a C/S (or Q/T) can reflect its control point
    const previous = { cubic: tracer.lastCubicControl, quad: tracer.lastQuadControl }
    tracer.lastCubicControl = null
    tracer.lastQuadControl = null
    SEGMENT_TRACERS[lowerCommand](tracer, params, origin, previous)
  }
  if (!tracer.hasPoints) {
    throw new Error(`Invalid SVG path: "${pathData}" draws nothing`)
  }
  return [round(tracer.minX), round(tracer.minY), round(tracer.maxX - tracer.minX), round(tracer.maxY - tracer.minY)]
}
