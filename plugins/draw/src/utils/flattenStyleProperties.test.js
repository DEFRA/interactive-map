import { flattenStyleProperties, definedOnly, mapStyleIds, toStyleChanges, isStyleProperty } from './flattenStyleProperties.js'

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

describe('definedOnly', () => {
  test('drops undefined values and keeps null', () => {
    expect(definedOnly({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null })
    expect(definedOnly()).toEqual({})
  })
})

describe('mapStyleIds', () => {
  test('lists the ids of the map styles in map state', () => {
    expect(mapStyleIds({ mapStyles: [{ id: 'outdoor' }, { id: 'dark' }] })).toEqual(['outdoor', 'dark'])
    expect(mapStyleIds({})).toEqual([])
    expect(mapStyleIds(undefined)).toEqual([])
  })
})

describe('toStyleChanges', () => {
  const styleIds = ['outdoor', 'dark']
  const existing = {
    stroke: 'brown',
    strokeOutdoor: 'brown',
    strokeDark: 'tan',
    strokeAerial: 'grey', // a style that isn't configured
    strokeWidth: 4,
    strokeWidthDark: 6,
    fill: 'green',
    fillType: 'arable', // page data
    strokeNote: 'cut in March' // page data
  }

  test('a single value removes that prop\'s keys for each known map style', () => {
    expect(toStyleChanges(existing, { stroke: 'red' }, styleIds)).toEqual({ strokeOutdoor: undefined, strokeDark: undefined, stroke: 'red' })
  })

  test('a per-style object replaces the old keys, including styles it leaves out', () => {
    expect(toStyleChanges(existing, { stroke: { outdoor: 'red' } }, styleIds)).toEqual({ strokeOutdoor: 'red', strokeDark: undefined, stroke: 'red' })
  })

  test('strokeWidth\'s per-style keys belong to strokeWidth, not stroke', () => {
    expect(toStyleChanges(existing, { strokeWidth: 2 }, styleIds)).toEqual({ strokeWidthDark: undefined, strokeWidth: 2 })
  })

  test('never touches data properties, or keys for a style that isn\'t configured', () => {
    const changes = toStyleChanges(existing, { stroke: 'red', fill: 'blue' }, styleIds)
    expect(changes).not.toHaveProperty('fillType')
    expect(changes).not.toHaveProperty('strokeNote')
    expect(changes).not.toHaveProperty('strokeAerial')
  })

  test('removes nothing without known map styles', () => {
    expect(toStyleChanges(existing, { stroke: 'red' })).toEqual({ stroke: 'red' })
  })

  test('props left out, undefined or not style props are passed through', () => {
    expect(toStyleChanges(existing, { fill: undefined }, styleIds)).toEqual({})
    expect(toStyleChanges(existing, { name: 'hedge' }, styleIds)).toEqual({ name: 'hedge' })
    expect(toStyleChanges(undefined, undefined, undefined)).toEqual({})
  })
})

describe('isStyleProperty', () => {
  test('is true for stroke/fill/strokeWidth, their keys for a known map style, and symbol-family keys', () => {
    const styleIds = ['outdoor', 'dark']
    const styleKeys = ['stroke', 'fill', 'strokeWidth', 'strokeDark', 'fillOutdoor', 'strokeWidthDark', 'symbol', 'symbolBackgroundColor']
    expect(styleKeys.every((key) => isStyleProperty(key, styleIds))).toBe(true)
  })

  test('is false for data properties and keys for a style that isn\'t configured', () => {
    const styleIds = ['outdoor', 'dark']
    expect(['fillType', 'strokeNote', 'strokeAerial', 'name', 'symbolImageId'].some((key) => isStyleProperty(key, styleIds))).toBe(false)
    expect(isStyleProperty('strokeDark')).toBe(false)
  })
})
