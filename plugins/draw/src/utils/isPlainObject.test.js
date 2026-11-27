import { isPlainObject } from './isPlainObject.js'

describe('isPlainObject', () => {
  test('is true for an object literal and Object.create(null)', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ name: 'North field' })).toBe(true)
    expect(isPlainObject(Object.create(null))).toBe(true)
  })

  test('is false for other objects', () => {
    class Properties {}
    const others = [[], new Map(), new Set(), new Date(), new URL('http://localhost'), new Properties()]
    for (const other of others) {
      expect(isPlainObject(other)).toBe(false)
    }
  })

  test('is false for null and primitives', () => {
    const primitives = [null, undefined, 'text', 3, true]
    for (const primitive of primitives) {
      expect(isPlainObject(primitive)).toBe(false)
    }
  })
})
