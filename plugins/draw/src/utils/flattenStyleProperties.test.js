import { flattenStyleProperties } from './flattenStyleProperties.js'

describe('flattenStyleProperties', () => {
  test('returns an empty object for nullish input', () => {
    expect(flattenStyleProperties(null)).toEqual({})
    expect(flattenStyleProperties(undefined)).toEqual({})
  })

  test('flattens a style-variant object into base + per-style keys', () => {
    const result = flattenStyleProperties({ stroke: { light: 'red', dark: 'blue' } })
    expect(result).toEqual({
      stroke: 'red', // base = first variant value
      strokeLight: 'red',
      strokeDark: 'blue'
    })
  })

  test('passes through a scalar style value unchanged', () => {
    expect(flattenStyleProperties({ stroke: 'red' })).toEqual({ stroke: 'red' })
  })

  test('passes through a null style value unchanged', () => {
    expect(flattenStyleProperties({ fill: null })).toEqual({ fill: null })
  })

  test('passes through non-style properties untouched', () => {
    expect(flattenStyleProperties({ name: 'field', count: 3 })).toEqual({ name: 'field', count: 3 })
  })

  test('ignores an empty style-variant object (no base, no variants)', () => {
    expect(flattenStyleProperties({ fill: {} })).toEqual({})
  })
})
