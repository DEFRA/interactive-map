import { getValueForStyle } from './getValueForStyle.js'

describe('getValueForStyle', () => {
  test('returns primitive values unchanged', () => {
    expect(getValueForStyle('red', 'light')).toBe('red')
    expect(getValueForStyle(5, 'light')).toBe(5)
  })

  test('returns null unchanged', () => {
    expect(getValueForStyle(null, 'light')).toBeNull()
  })

  test('prefers an exact style-id match', () => {
    expect(getValueForStyle({ outdoor: 'green', light: 'red' }, 'light', 'outdoor')).toBe('green')
  })

  test('falls back to the scheme match when the style id is absent', () => {
    expect(getValueForStyle({ light: 'red', dark: 'blue' }, 'dark', 'outdoor')).toBe('blue')
  })

  test('uses the scheme match when no style id is provided', () => {
    expect(getValueForStyle({ light: 'red', dark: 'blue' }, 'dark')).toBe('blue')
  })

  test('falls back to the light property when the scheme is missing', () => {
    expect(getValueForStyle({ light: 'red', dark: 'blue' }, 'sepia')).toBe('red')
  })

  test('falls back to the first value when neither scheme nor light exist', () => {
    expect(getValueForStyle({ outdoor: 'green', satellite: 'grey' }, 'dark')).toBe('green')
  })
})
