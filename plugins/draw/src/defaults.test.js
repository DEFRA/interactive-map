import { COLORS, SIZES, TOLERANCES, KEYBOARD, MAP_SIZE_SCALES } from './defaults.js'

describe('draw defaults', () => {
  test('exposes colour variants for the edit palette', () => {
    expect(COLORS.editStroke).toEqual(expect.objectContaining({ light: expect.any(String), dark: expect.any(String) }))
    expect(COLORS.shapeStroke).toEqual(expect.any(String))
  })

  test('exposes numeric sizes and tolerances', () => {
    expect(SIZES.touchTargetSize).toBe(48)
    expect(TOLERANCES.snapRadius).toBe(12)
    expect(KEYBOARD).toEqual({ nudgeAmount: 1, stepAmount: 5 })
  })

  test('maps app map sizes to scale factors', () => {
    expect(MAP_SIZE_SCALES).toEqual({ small: 1, medium: 1.5, large: 2 })
  })
})
