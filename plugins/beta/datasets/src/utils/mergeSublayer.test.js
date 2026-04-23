import { mergeSublayer } from './mergeSublayer'

const baseDataset = {
  stroke: '#d4351c',
  strokeWidth: 2,
  strokeDashArray: null,
  opacity: 1,
  fill: 'transparent',
  fillPattern: undefined,
  fillPatternSvgContent: undefined,
  fillPatternForegroundColor: '#000',
  fillPatternBackgroundColor: '#fff',
  keySymbolShape: 'polygon',
  symbolDescription: 'red outline',
  showInKey: true,
  filter: null,
  minZoom: 6,
  maxZoom: 24,
  symbol: undefined,
  symbolSvgContent: undefined,
  symbolViewBox: undefined,
  symbolAnchor: 'bottom',
  symbolBackgroundColor: undefined,
  symbolForegroundColor: undefined,
  symbolHaloWidth: undefined,
  symbolGraphic: undefined
}

const sublayer = { id: 'sl', label: 'Sublayer', style: {} }

describe('mergeSublayer — identity', () => {
  it('uses the sublayer id and label', () => {
    const result = mergeSublayer(baseDataset, { id: 'my-sl', label: 'My Sublayer', style: {} })
    expect(result.id).toBe('my-sl')
    expect(result.label).toBe('My Sublayer')
  })

  it('inherits minZoom and maxZoom from the dataset', () => {
    const result = mergeSublayer(baseDataset, sublayer)
    expect(result.minZoom).toBe(6)
    expect(result.maxZoom).toBe(24)
  })
})

describe('mergeSublayer — stroke props', () => {
  it('inherits stroke from dataset when sublayer style has none', () => {
    const result = mergeSublayer(baseDataset, sublayer)
    expect(result.stroke).toBe('#d4351c')
  })

  it('overrides stroke from sublayer style', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { stroke: '#0000ff' } })
    expect(result.stroke).toBe('#0000ff')
  })

  it('inherits strokeWidth from dataset when sublayer style has none', () => {
    const result = mergeSublayer(baseDataset, sublayer)
    expect(result.strokeWidth).toBe(2)
  })

  it('overrides strokeWidth from sublayer style', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { strokeWidth: 4 } })
    expect(result.strokeWidth).toBe(4)
  })

  it('inherits strokeDashArray from dataset when sublayer style has none', () => {
    const ds = { ...baseDataset, strokeDashArray: [4, 2] }
    const result = mergeSublayer(ds, sublayer)
    expect(result.strokeDashArray).toEqual([4, 2])
  })

  it('overrides strokeDashArray from sublayer style', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { strokeDashArray: [2, 4] } })
    expect(result.strokeDashArray).toEqual([2, 4])
  })
})

describe('mergeSublayer — opacity', () => {
  it('inherits opacity from dataset when sublayer style has none', () => {
    const result = mergeSublayer(baseDataset, sublayer)
    expect(result.opacity).toBe(1)
  })

  it('overrides opacity from sublayer style', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { opacity: 0.5 } })
    expect(result.opacity).toBe(0.5)
  })
})

describe('mergeSublayer — fill props', () => {
  it('inherits fill from dataset when sublayer style has none', () => {
    const result = mergeSublayer({ ...baseDataset, fill: 'blue' }, sublayer)
    expect(result.fill).toBe('blue')
  })

  it('overrides fill from sublayer style when fill is explicitly set', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { fill: 'green' } })
    expect(result.fill).toBe('green')
  })

  it('clears parent fillPattern when sublayer explicitly sets a plain fill', () => {
    const ds = { ...baseDataset, fillPattern: 'dots' }
    const result = mergeSublayer(ds, { ...sublayer, style: { fill: 'blue' } })
    expect(result.fillPattern).toBeUndefined()
  })

  it('inherits fillPattern from dataset when sublayer style has none', () => {
    const ds = { ...baseDataset, fillPattern: 'dots' }
    const result = mergeSublayer(ds, sublayer)
    expect(result.fillPattern).toBe('dots')
  })

  it('uses sublayer fillPattern over dataset fill', () => {
    const result = mergeSublayer(
      { ...baseDataset, fill: 'blue' },
      { ...sublayer, style: { fillPattern: 'stripes' } }
    )
    expect(result.fillPattern).toBe('stripes')
    expect(result.fill).toBeUndefined()
  })

  it('uses sublayer fillPatternForegroundColor over dataset when set', () => {
    const result = mergeSublayer(
      { ...baseDataset, fillPatternForegroundColor: '#111' },
      { ...sublayer, style: { fillPattern: 'dots', fillPatternForegroundColor: '#999' } }
    )
    expect(result.fillPatternForegroundColor).toBe('#999')
  })

  it('falls back to dataset fillPatternForegroundColor when sublayer does not set one', () => {
    const result = mergeSublayer(
      { ...baseDataset, fillPatternForegroundColor: '#111' },
      { ...sublayer, style: { fillPattern: 'dots' } }
    )
    expect(result.fillPatternForegroundColor).toBe('#111')
  })

  it('uses sublayer fillPatternSvgContent over dataset fill', () => {
    const result = mergeSublayer(
      { ...baseDataset, fill: 'blue' },
      { ...sublayer, style: { fillPatternSvgContent: '<svg/>' } }
    )
    expect(result.fillPatternSvgContent).toBe('<svg/>')
    expect(result.fill).toBeUndefined()
  })
})

describe('mergeSublayer — symbol props', () => {
  it('inherits symbol from dataset when sublayer style has none', () => {
    const ds = { ...baseDataset, symbol: 'marker' }
    const result = mergeSublayer(ds, sublayer)
    expect(result.symbol).toBe('marker')
  })

  it('overrides symbol from sublayer style', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { symbol: 'pin' } })
    expect(result.symbol).toBe('pin')
  })

  it('inherits symbolAnchor from dataset', () => {
    const result = mergeSublayer(baseDataset, sublayer)
    expect(result.symbolAnchor).toBe('bottom')
  })

  it('overrides symbolAnchor from sublayer style', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { symbolAnchor: 'center' } })
    expect(result.symbolAnchor).toBe('center')
  })

  it('inherits symbolSvgContent, symbolViewBox, symbolBackgroundColor, symbolForegroundColor, symbolHaloWidth, symbolGraphic from dataset', () => {
    const ds = {
      ...baseDataset,
      symbolSvgContent: '<svg/>',
      symbolViewBox: '0 0 24 24',
      symbolBackgroundColor: '#fff',
      symbolForegroundColor: '#000',
      symbolHaloWidth: 2,
      symbolGraphic: 'asset.png'
    }
    const result = mergeSublayer(ds, sublayer)
    expect(result.symbolSvgContent).toBe('<svg/>')
    expect(result.symbolViewBox).toBe('0 0 24 24')
    expect(result.symbolBackgroundColor).toBe('#fff')
    expect(result.symbolForegroundColor).toBe('#000')
    expect(result.symbolHaloWidth).toBe(2)
    expect(result.symbolGraphic).toBe('asset.png')
  })
})

describe('mergeSublayer — symbolDescription', () => {
  it('inherits symbolDescription from dataset when sublayer has no custom visual style', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { strokeWidth: 4 } })
    expect(result.symbolDescription).toBe('red outline')
  })

  it('drops symbolDescription when sublayer introduces a custom visual style without setting its own', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { stroke: '#0000ff' } })
    expect(result.symbolDescription).toBeUndefined()
  })

  it('uses the sublayer symbolDescription when explicitly set', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { stroke: '#0000ff', symbolDescription: 'blue line' } })
    expect(result.symbolDescription).toBe('blue line')
  })

  it('uses an empty-string sublayer symbolDescription when explicitly set', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { symbolDescription: '' } })
    expect(result.symbolDescription).toBe('')
  })
})

describe('mergeSublayer — keySymbolShape', () => {
  it('inherits keySymbolShape from dataset', () => {
    const result = mergeSublayer(baseDataset, sublayer)
    expect(result.keySymbolShape).toBe('polygon')
  })

  it('overrides keySymbolShape from sublayer style', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, style: { keySymbolShape: 'line' } })
    expect(result.keySymbolShape).toBe('line')
  })
})

describe('mergeSublayer — visibility / key / menu', () => {
  it('inherits showInKey from dataset when sublayer does not set it', () => {
    const result = mergeSublayer(baseDataset, sublayer)
    expect(result.showInKey).toBe(true)
  })

  it('uses sublayer showInKey when set', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, showInKey: false })
    expect(result.showInKey).toBe(false)
  })

  it('defaults showInMenu to false', () => {
    const result = mergeSublayer(baseDataset, sublayer)
    expect(result.showInMenu).toBe(false)
  })

  it('uses sublayer showInMenu when set to true', () => {
    const result = mergeSublayer(baseDataset, { ...sublayer, showInMenu: true })
    expect(result.showInMenu).toBe(true)
  })
})

describe('mergeSublayer — filter', () => {
  it('is null when neither dataset nor sublayer has a filter', () => {
    const result = mergeSublayer(baseDataset, sublayer)
    expect(result.filter).toBeNull()
  })

  it('uses the dataset filter when only the dataset has one', () => {
    const ds = { ...baseDataset, filter: ['==', 'type', 'park'] }
    const result = mergeSublayer(ds, sublayer)
    expect(result.filter).toEqual(['==', 'type', 'park'])
  })

  it('uses the sublayer filter when only the sublayer has one', () => {
    const sl = { ...sublayer, filter: ['==', 'class', 'road'] }
    const result = mergeSublayer(baseDataset, sl)
    expect(result.filter).toEqual(['==', 'class', 'road'])
  })

  it('combines both filters with all when both are present', () => {
    const ds = { ...baseDataset, filter: ['==', 'type', 'park'] }
    const sl = { ...sublayer, filter: ['==', 'class', 'wood'] }
    const result = mergeSublayer(ds, sl)
    expect(result.filter).toEqual(['all', ['==', 'type', 'park'], ['==', 'class', 'wood']])
  })
})

describe('mergeSublayer — no sublayer style', () => {
  it('handles a sublayer with no style property', () => {
    const result = mergeSublayer(baseDataset, { id: 'sl', label: 'Sublayer' })
    expect(result.stroke).toBe('#d4351c')
    expect(result.fill).toBe('transparent')
  })
})
