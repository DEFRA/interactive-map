import { calculateLinearTextSize } from './calculateLinearTextSize.js'

describe('calculateLinearTextSize', () => {
  it('returns 0 if stops is empty', () => {
    expect(calculateLinearTextSize({ stops: [] }, 5)).toBe(0)
  })

  it('returns single stop value if stops has one entry', () => {
    expect(calculateLinearTextSize({ stops: [[3, 10]] }, 5)).toBe(10)
  })

  it('returns lower stop if zoom below first stop', () => {
    expect(calculateLinearTextSize({ stops: [[3, 10], [6, 20]] }, 2)).toBe(10)
  })

  it('returns upper stop if zoom above last stop', () => {
    expect(calculateLinearTextSize({ stops: [[3, 10], [6, 20]] }, 7)).toBe(20)
  })

  it('interpolates between stops for zoom in range', () => {
    expect(calculateLinearTextSize({ stops: [[3, 10], [6, 20]] }, 4.5)).toBe(15)
  })

  it('works with multiple stops', () => {
    const expr = { stops: [[0, 5], [5, 15], [10, 25]] }
    expect(calculateLinearTextSize(expr, -1)).toBe(5)  // below first
    expect(calculateLinearTextSize(expr, 12)).toBe(25)  // above last
    expect(calculateLinearTextSize(expr, 2.5)).toBe(10) // between first two
    expect(calculateLinearTextSize(expr, 7.5)).toBe(20) // between last two
  })
})