import { datasetDefaults, hasCustomVisualStyle, applyStyleDefaults, applyDatasetDefaults, applyDatasetDefaultsWithoutFlattening } from './defaults'

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

describe('applyDatasetDefaults', () => {
  const defaults = {
    minZoom: 6,
    maxZoom: 24,
    showInKey: false,
    style: {
      stroke: '#d4351c',
      strokeWidth: 2,
      symbolDescription: 'red outline'
    }
  }

  it('merges top-level dataset properties over defaults', () => {
    const dataset = { id: 'test', minZoom: 10 }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.minZoom).toBe(10)
    expect(result.maxZoom).toBe(24)
    expect(result.showInKey).toBe(false)
  })

  it('flattens style properties into the result', () => {
    const dataset = { id: 'test', style: { strokeWidth: 4 } }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.strokeWidth).toBe(4)
    expect(result.stroke).toBe('#d4351c')
    expect(result.style).toBeUndefined()
  })

  it('does not apply the default stroke when the dataset has a custom visual style', () => {
    const dataset = { id: 'test', style: { fill: 'transparent' } }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.fill).toBe('transparent')
    expect(result.stroke).toBeUndefined()
    expect(result.strokeWidth).toBe(2)
  })

  it('dataset style properties override default style properties', () => {
    const dataset = { id: 'test', style: { stroke: '#0000ff' } }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.stroke).toBe('#0000ff')
  })

  it('drops symbolDescription from defaults when custom visual style is present and no explicit symbolDescription', () => {
    const dataset = { id: 'test', style: { stroke: '#0000ff' } }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.symbolDescription).toBeUndefined()
  })

  it('keeps symbolDescription when dataset provides its own, even with custom visual style', () => {
    const dataset = { id: 'test', style: { stroke: '#0000ff', symbolDescription: 'blue outline' } }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.symbolDescription).toBe('blue outline')
  })

  it('keeps symbolDescription from defaults when no custom visual style is present', () => {
    const dataset = { id: 'test', style: { strokeWidth: 4 } }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.symbolDescription).toBe('red outline')
  })

  it('keeps symbolDescription from defaults when dataset has no style', () => {
    const dataset = { id: 'test' }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.symbolDescription).toBe('red outline')
  })

  it('ignores style properties set at top level of dataset', () => {
    const dataset = { id: 'test', stroke: '#ignored' }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.stroke).toBe('#d4351c')
  })

  it('does not include style key in the result', () => {
    const dataset = { id: 'test', style: { fill: 'blue' } }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result).not.toHaveProperty('style')
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

  it('uses the given default style', () => {
    expect(applyStyleDefaults({}, { stroke: 'green', strokeWidth: 3 })).toEqual({ stroke: 'green', strokeWidth: 3 })
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
})
