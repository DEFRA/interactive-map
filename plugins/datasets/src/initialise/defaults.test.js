import { datasetDefaults, hasCustomVisualStyle, applyStyleDefaults, applyDatasetDefaultsWithoutFlattening } from './defaults'

describe('datasetDefaults', () => {
  it('has expected top-level defaults', () => {
    expect(datasetDefaults).toMatchObject({
      minZoom: 6,
      maxZoom: 24,
      showInKey: false,
      showInMenu: false,
      visible: true
    })
  })

  it('has expected style defaults', () => {
    expect(datasetDefaults.style).toMatchObject({
      stroke: '#d4351c',
      strokeWidth: 2,
      symbolDescription: 'red outline'
    })
  })
})

describe('hasCustomVisualStyle', () => {
  it('returns true when stroke is present', () => {
    expect(hasCustomVisualStyle({ stroke: '#ff0000' })).toBe(true)
  })

  it('returns true when fill is present', () => {
    expect(hasCustomVisualStyle({ fill: 'blue' })).toBe(true)
  })

  it('returns true when fillPattern is present', () => {
    expect(hasCustomVisualStyle({ fillPattern: 'dots' })).toBe(true)
  })

  it('returns true when fillPatternSvgContent is present', () => {
    expect(hasCustomVisualStyle({ fillPatternSvgContent: '<svg/>' })).toBe(true)
  })

  it('returns true when symbol is present', () => {
    expect(hasCustomVisualStyle({ symbol: 'marker' })).toBe(true)
  })

  it('returns true when symbolSvgContent is present', () => {
    expect(hasCustomVisualStyle({ symbolSvgContent: '<svg/>' })).toBe(true)
  })

  it('returns false when no visual style props are present', () => {
    expect(hasCustomVisualStyle({ strokeWidth: 2, opacity: 0.5 })).toBe(false)
  })

  it('returns false for an empty style object', () => {
    expect(hasCustomVisualStyle({})).toBe(false)
  })
})

describe('applyStyleDefaults', () => {
  it('applies the whole default style when there is no style', () => {
    expect(applyStyleDefaults()).toEqual({ stroke: '#d4351c', strokeWidth: 2, symbolDescription: 'red outline' })
  })

  it('applies the whole default style under a style without a custom visual style', () => {
    expect(applyStyleDefaults({ strokeWidth: 4, opacity: 0.5 })).toEqual({
      stroke: '#d4351c', strokeWidth: 4, symbolDescription: 'red outline', opacity: 0.5
    })
  })

  it('applies only the default strokeWidth under a custom visual style', () => {
    expect(applyStyleDefaults({ fill: 'blue' })).toEqual({ fill: 'blue', strokeWidth: 2 })
  })

  it('treats an explicitly empty stroke as a custom visual style', () => {
    expect(applyStyleDefaults({ stroke: null })).toEqual({ stroke: null, strokeWidth: 2 })
  })
})

describe('applyDatasetDefaultsWithoutFlattening', () => {
  it('applies top-level defaults but keeps the style as given', () => {
    const result = applyDatasetDefaultsWithoutFlattening({ id: 'test', style: { fill: 'blue' } })
    expect(result).toMatchObject({ id: 'test', minZoom: 6, maxZoom: 24, visible: true })
    expect(result.style).toEqual({ fill: 'blue' })
  })

  it('gives a dataset without a style an empty style', () => {
    expect(applyDatasetDefaultsWithoutFlattening({ id: 'test' }).style).toEqual({})
  })

  it('ignores style properties set at the top level of the dataset', () => {
    const result = applyDatasetDefaultsWithoutFlattening({ id: 'test', stroke: '#ignored', fill: '#ignored' })
    expect(result).not.toHaveProperty('stroke')
    expect(result).not.toHaveProperty('fill')
    expect(result.style).toEqual({})
  })
})
