import { getPathBounds } from './pathBounds.js'
import * as symbolConfig from '../config/symbolConfig.js'

const expectBounds = (d, expected) => {
  getPathBounds(d).forEach((value, i) => expect(value).toBeCloseTo(expected[i], 3))
}

describe('getPathBounds — lines', () => {
  it('bounds absolute lines and closepath', () => {
    expectBounds('M2 3L10 3L10 8Z', [2, 3, 8, 5])
  })

  it('bounds relative, horizontal and vertical commands', () => {
    expectBounds('m2 3h8v5h-8z', [2, 3, 8, 5])
  })

  it('treats extra moveto coordinates as linetos (absolute and relative)', () => {
    expectBounds('M0 0 10 0 10 10', [0, 0, 10, 10])
    expectBounds('m1 1 4 0 0 4', [1, 1, 4, 4])
  })

  it('continues from the subpath start after closepath', () => {
    expectBounds('M5 5h2v2zl-5 -5', [0, 0, 7, 7])
  })

  it('parses commas, exponents and numbers without separators', () => {
    expectBounds('M1e1,2L-3.5.5', [-3.5, 0.5, 13.5, 1.5])
  })
})

describe('getPathBounds — curves', () => {
  it('includes a cubic curve\'s extreme, not its control points', () => {
    // control points at y=-10, but the curve itself only reaches y=-7.5
    expectBounds('M0 0C0 -10 10 -10 10 0', [0, -7.5, 10, 7.5])
  })

  it('reflects the previous control point for S', () => {
    // S mirrors (0,-10)→(10,-10) about (10,0), giving a downward bulge to y=7.5
    expectBounds('M0 0C0 -10 10 -10 10 0S20 10 20 0', [0, -7.5, 20, 15])
  })

  it('uses the current point as S\'s first control point when there\'s no previous cubic', () => {
    // control points (0,0) and (10,-10): the curve turns at t = 2/3, y = -40/9
    expectBounds('M0 0S10 -10 10 0', [0, -40 / 9, 10, 40 / 9])
  })

  it('adds nothing for a cubic that never turns along an axis', () => {
    // x runs 0→10 without turning back, and y's only turning points are at the endpoints
    expectBounds('M0 0C5 0 5 10 10 10', [0, 0, 10, 10])
  })

  it('includes a quadratic curve\'s extreme', () => {
    expectBounds('M0 0Q5 -10 10 0', [0, -5, 10, 5])
  })

  it('reflects the previous control point for T', () => {
    expectBounds('M0 0Q5 -10 10 0T20 0', [0, -5, 20, 10])
  })

  it('treats T with no previous quadratic as a straight line', () => {
    expectBounds('M0 0T20 10', [0, 0, 20, 10])
  })

  it('handles a cubic whose turning point equation is linear (a cubic that\'s really a quadratic)', () => {
    // y control points 0, 10, 10, 0: the derivative's t² term cancels, leaving one turn at t = 0.5
    expectBounds('M0 0C0 10 10 10 10 0', [0, 0, 10, 7.5])
  })

  it('includes curves\' extremes along x as well as y', () => {
    expectBounds('M0 0C10 0 10 10 0 10', [0, 0, 7.5, 10])
    expectBounds('M0 0Q10 5 0 10', [0, 0, 5, 10])
  })

  it('adds nothing for a straight-line cubic', () => {
    expectBounds('M0 0C10 10 20 20 30 30', [0, 0, 30, 30])
  })
})

describe('getPathBounds — arcs', () => {
  it('includes the points an arc sweeps through', () => {
    // a half circle over the top of (0,0)-(20,0): reaches y=-10
    expectBounds('M0 0A10 10 0 0 1 20 0', [0, -10, 20, 10])
    // the same endpoints swept the other way: the bottom half
    expectBounds('M0 0A10 10 0 0 0 20 0', [0, 0, 20, 10])
  })

  it('leaves out extremes a short arc doesn\'t reach', () => {
    // a quarter circle from the top to the right of centre (0,10) stays within its endpoints
    expectBounds('M0 0A10 10 0 0 1 10 10', [0, 0, 10, 10])
  })

  it('includes the far side for a large arc', () => {
    // 270° the long way round from (0,0) to (10,10) about centre (0,10)
    expectBounds('M0 0A10 10 0 1 0 10 10', [-10, 0, 20, 20])
  })

  it('scales up radii too small to span the endpoints', () => {
    // radius 1 can't reach from (0,0) to (20,0), so it's scaled to a radius-10 half circle
    expectBounds('M0 0A1 1 0 0 1 20 0', [0, -10, 20, 10])
  })

  it('handles rotated ellipses', () => {
    // a full ellipse (two half arcs), rx 10 ry 5, rotated 90° — so 10 tall and 5 wide each side
    expectBounds('M0 -10A10 5 90 0 1 0 10A10 5 90 0 1 0 -10', [-5, -10, 10, 20])
  })

  it('reads arc flags written without separators', () => {
    expectBounds('M0 0a10 10 0 0120 0', [0, -10, 20, 10])
  })

  it('treats a zero-radius arc as a straight line', () => {
    expectBounds('M0 0A0 5 0 0 1 20 10', [0, 0, 20, 10])
  })
})

describe('getPathBounds — errors', () => {
  it('throws for an empty path', () => {
    expect(() => getPathBounds('')).toThrow('draws nothing')
  })

  it('throws for an unknown command', () => {
    expect(() => getPathBounds('M0 0X10 10')).toThrow('unexpected "X"')
  })

  it('throws for a missing number', () => {
    expect(() => getPathBounds('M0 0L10')).toThrow('expected a number')
  })

  it('throws for an invalid arc flag', () => {
    expect(() => getPathBounds('M0 0A10 10 0 2 1 20 0')).toThrow('arc flag')
  })

  it('throws for parameters before any command', () => {
    expect(() => getPathBounds('10 10')).toThrow('unexpected')
  })
})

// The built-in shapes' bounds are typed into symbolConfig.js; they drive each symbol's viewBox,
// anchor and centring, so they must always match the path they describe.
describe('built-in symbol bounds', () => {
  it.each(['pin', 'circle', 'square', 'hexagon', 'triangle', 'diamond'])('%s bounds match its path', (id) => {
    const { path, bounds } = symbolConfig[id]
    expectBounds(path, bounds)
  })
})
