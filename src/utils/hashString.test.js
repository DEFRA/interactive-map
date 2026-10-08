import { hashString } from './hashString.js'

describe('hashString', () => {
  test('returns a non-empty string', () => {
    expect(typeof hashString('hello')).toBe('string')
    expect(hashString('hello').length).toBeGreaterThan(0)
  })

  test('is deterministic', () => {
    expect(hashString('hello')).toBe(hashString('hello'))
  })

  it('returns the same hash for the same input', () => {
    expect(hashString('https://tiles.example.com/{z}/{x}/{y}'))
      .toBe(hashString('https://tiles.example.com/{z}/{x}/{y}'))
  })

  test('produces different values for different inputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'))
  })

  it('handles an empty string without throwing', () => {
    expect(() => hashString('')).not.toThrow()
  })

  it('is two 32-bit hashes in base 36', () => {
    expect(hashString('<path d="M0 0"/>')).toMatch(/^[a-z0-9]{2,14}$/)
  })
})
