import { getValueForStyle } from './getValueForStyle.js'

describe('getValueForStyle', () => {
  // --- Case 1: colors is falsy
  it('returns null if colors is null or undefined', () => {
    expect(getValueForStyle(null, 'anyStyle')).toBeNull()
    expect(getValueForStyle(undefined, 'anyStyle')).toBeNull()
  })

  // --- Case 2: colors is a simple string
  it('returns the trimmed string color if colors is a string', () => {
    expect(getValueForStyle('#fff', 'anyStyle')).toBe('#fff')
    expect(getValueForStyle(' rgba(255,0,0,0.5) ', 'anyStyle')).toBe('rgba(255,0,0,0.5)')
  })

  // --- Case 3: colors is an object with mapStyleId matching
  it('returns the style-specific color if mapStyleId matches a key', () => {
    const colorMap = {
      dark: '#000',
      light: '#fff'
    }
    expect(getValueForStyle(colorMap, 'dark')).toBe('#000')
    expect(getValueForStyle(colorMap, 'light')).toBe('#fff')
  })

  // --- Case 4: colors is an object but mapStyleId does not match
  it('returns the first value in the object if mapStyleId does not match', () => {
    const colorMap = {
      dark: '#000',
      light: '#fff'
    }
    expect(getValueForStyle(colorMap, 'unknown')).toBe('#000') // first value
  })

  // --- Case 5: colors is an empty object
  it('returns null if colors is an empty object', () => {
    expect(getValueForStyle({}, 'dark')).toBeNull()
  })

  // --- Case 6: colors is an object but first value is falsy
  it('returns null if first value in object is undefined', () => {
    const colorMap = { dark: undefined }
    expect(getValueForStyle(colorMap, 'light')).toBeNull()
  })

  // --- Case 7: mapStyleId not provided
  it('returns first value in object if mapStyleId is not provided', () => {
    const colorMap = { dark: '#000', light: '#fff' }
    expect(getValueForStyle(colorMap)).toBe('#000')
  })

  // --- Case 8: numbers
  it('returns a number, including zero', () => {
    expect(getValueForStyle(42, 'anyStyle')).toBe(42)
    expect(getValueForStyle(0, 'anyStyle')).toBe(0)
  })

  it('returns the style-specific number, including zero', () => {
    const widths = { outdoor: 2, dark: 0 }
    expect(getValueForStyle(widths, 'outdoor')).toBe(2)
    expect(getValueForStyle(widths, 'dark')).toBe(0)
  })

  // --- Case 9: fallback
  it('returns null for unsupported types to hit final return null', () => {
    expect(getValueForStyle(true, 'anyStyle')).toBeNull() // boolean
    expect(getValueForStyle([], 'anyStyle')).toBeNull() // array
    expect(getValueForStyle(() => {}, 'anyStyle')).toBeNull() // function
  })
})
