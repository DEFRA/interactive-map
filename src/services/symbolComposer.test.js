import {
  composeSymbolDef, applyAnchorOverride, scaleSvgSymbolDef, getGraphicTransform, renderComposed, renderTemplate
} from './symbolComposer.js'
import { circle, pin, graphics, SYMBOL_PADDING } from '../config/symbolConfig.js'
import { logger } from './logger.js'

jest.mock('./logger.js', () => ({ logger: { warn: jest.fn() } }))

const dims = (viewBox) => viewBox.split(' ').map(Number).slice(2)
const values = {
  backgroundColor: '#ca3535',
  foregroundColor: '#ffffff',
  haloColor: '#ffffff',
  selectedColor: 'none',
  activeColor: 'none',
  graphic: graphics.dot
}

describe('composeSymbolDef', () => {
  it('pads the scaled body by SYMBOL_PADDING on every side, rounded up to a multiple of 4', () => {
    const [width, height] = dims(composeSymbolDef(circle, 1.25).viewBox)
    // 26 × 1.25 + 16 = 48.5, rounded up to 52
    expect(26 * 1.25 + SYMBOL_PADDING * 2).toBe(48.5)
    expect(width).toBe(52)
    expect(height).toBe(width)
  })

  it('returns the same object for the same def and scale', () => {
    expect(composeSymbolDef(pin, 0.75)).toBe(composeSymbolDef(pin, 0.75))
  })

  it('records the body\'s box within the viewBox', () => {
    const { bodyBox, viewBox } = composeSymbolDef(circle, 1)
    expect(bodyBox).toEqual([9, 9, 26, 26])
    expect(dims(viewBox)).toEqual([44, 44])
  })
})

describe('applyAnchorOverride', () => {
  it('returns the def unchanged when there\'s no override', () => {
    const sized = composeSymbolDef(circle, 1)
    expect(applyAnchorOverride(sized, undefined)).toBe(sized)
  })

  it('treats a built-in shape\'s override as a fraction of the shape, at every size', () => {
    [0.75, 1, 1.25].forEach((scale) => {
      const sized = composeSymbolDef(circle, scale)
      const { anchor, viewBox } = applyAnchorOverride(sized, [0.5, 1])
      const [width, height] = dims(viewBox)
      const [x, y, w, h] = sized.bodyBox
      // lands on the bottom-centre of the circle itself, not of its padded viewBox
      expect(anchor[0] * width).toBeCloseTo(x + w / 2)
      expect(anchor[1] * height).toBeCloseTo(y + h)
    })
  })

  it.each([[[0.5]], [['0.5', '1']], [[0.5, Number.NaN]], ['bottom']])('ignores an invalid override %j, warning once', (anchor) => {
    const sized = composeSymbolDef(circle, 1)
    logger.warn.mockClear()
    expect(applyAnchorOverride(sized, anchor)).toBe(sized)
    expect(applyAnchorOverride(sized, anchor)).toBe(sized)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid symbolAnchor'))
  })

  it('uses an SVG-template symbol\'s override as given — a fraction of its own viewBox', () => {
    const sized = scaleSvgSymbolDef({ svg: '<rect/>' }, '0 0 20 20', 1)
    expect(applyAnchorOverride(sized, [0.1, 0.9]).anchor).toEqual([0.1, 0.9])
  })
})

describe('scaleSvgSymbolDef', () => {
  it('leaves the svg as it is at scale 1', () => {
    expect(scaleSvgSymbolDef({ svg: '<rect/>' }, '0 0 20 10', 1)).toEqual({ svg: '<rect/>', viewBox: '0 0 20 10', anchor: [0.5, 0.5] })
  })

  it('keeps the symbol\'s own anchor', () => {
    expect(scaleSvgSymbolDef({ svg: '<rect/>', anchor: [0.5, 1] }, '0 0 20 10', 2).anchor).toEqual([0.5, 1])
  })

  it('scales the viewBox, origin included, and wraps the svg in a scale transform', () => {
    expect(scaleSvgSymbolDef({ svg: '<rect/>' }, '2 4 20 10', 1.5)).toEqual({ svg: '<g transform="scale(1.5)"><rect/></g>', viewBox: '3 6 30 15', anchor: [0.5, 0.5] })
  })
})

describe('getGraphicTransform', () => {
  it('leaves a graphic already centred in the 16×16 space where it is, at 0.8', () => {
    Object.values(graphics).forEach((graphic) => {
      expect(getGraphicTransform(graphic, 22, 20)).toBe('translate(22, 20) scale(0.8) translate(-8, -8)')
    })
  })

  it('centres and shrinks a graphic drawn in a bigger space (e.g. a 24×24 icon)', () => {
    // a square filling 0–24: centred on its middle (12, 12) and shrunk by 16/24
    expect(getGraphicTransform('M0 0H24V24H0Z', 22, 22)).toBe('translate(22, 22) scale(0.533) translate(-12, -12)')
  })

  it('centres a small off-centre graphic without enlarging it', () => {
    expect(getGraphicTransform('M0 0H4V4H0Z', 22, 22)).toBe('translate(22, 22) scale(0.8) translate(-2, -2)')
  })

  it('falls back to the 16×16 space\'s centre, with a warning, for a graphic it can\'t measure', () => {
    expect(getGraphicTransform('not a path', 22, 22)).toBe('translate(22, 22) scale(0.8) translate(-8, -8)')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('could not be measured'))
  })

  it('falls back to the 16×16 space\'s centre for no graphic', () => {
    expect(getGraphicTransform('', 22, 22)).toBe('translate(22, 22) scale(0.8) translate(-8, -8)')
  })
})

describe('renderComposed', () => {
  const countPaths = (svg) => svg.match(/<path /g).length

  it('emits only the body and graphic when no ring is showing', () => {
    expect(countPaths(renderComposed(composeSymbolDef(circle, 1), values))).toBe(2)
  })

  it('emits the selected ring, then the active ring, when their colours are set', () => {
    const selected = renderComposed(composeSymbolDef(circle, 1), { ...values, selectedColor: '#0b0c0c' })
    expect(countPaths(selected)).toBe(3)
    const active = renderComposed(composeSymbolDef(circle, 1), { ...values, selectedColor: '#0b0c0c', activeColor: '#ffdd00' })
    expect(countPaths(active)).toBe(4)
    expect(active.indexOf('#ffdd00')).toBeLessThan(active.indexOf('#0b0c0c')) // active ring is drawn underneath
  })
})

describe('renderTemplate', () => {
  it('substitutes every occurrence of each token', () => {
    expect(renderTemplate('<a fill="{{c}}"/><b fill="{{c}}"/>', { c: 'red' })).toBe('<a fill="red"/><b fill="red"/>')
  })
})
