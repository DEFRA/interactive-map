import { datasetDefaults, hasCustomVisualStyle, applyDatasetDefaults } from './defaults'

describe('datasetDefaults', () => {
  it('has expected top-level defaults', () => {
    expect(datasetDefaults).toMatchObject({
      minZoom: 6,
      maxZoom: 24,
      showInKey: false,
      showInMenu: false,
      visibility: 'visible'
    })
  })

  it('has expected style defaults', () => {
    expect(datasetDefaults.style).toMatchObject({
      stroke: '#d4351c',
      strokeWidth: 2,
      fill: 'transparent',
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
    const dataset = { id: 'test', style: { fill: 'transparent' } }
    const result = applyDatasetDefaults(dataset, defaults)
    expect(result.fill).toBe('transparent')
    expect(result.stroke).toBe('#d4351c')
    expect(result.style).toBeUndefined()
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
