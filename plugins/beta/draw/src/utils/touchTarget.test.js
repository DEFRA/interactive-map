import {
  createTouchTarget,
  applyTouchTargetColors,
  showTouchTarget,
  hideTouchTarget,
  isOnTouchTarget
} from './touchTarget.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

describe('createTouchTarget', () => {
  test('inserts the SVG target once and returns it', () => {
    const container = document.createElement('div')

    const el = createTouchTarget(container)

    expect(el).not.toBeNull()
    expect(el.hasAttribute('data-im-draw-touch-target')).toBe(true)
    expect(container.querySelectorAll('[data-im-draw-touch-target]')).toHaveLength(1)
  })

  test('returns the existing target without inserting a second one', () => {
    const container = document.createElement('div')
    const first = createTouchTarget(container)
    const second = createTouchTarget(container)

    expect(second).toBe(first)
    expect(container.querySelectorAll('[data-im-draw-touch-target]')).toHaveLength(1)
  })
})

describe('applyTouchTargetColors', () => {
  test('sets the CSS custom properties from the colours', () => {
    const el = document.createElement('div')

    applyTouchTargetColors(el, { editActive: 'a', editHalo: 'h', editVertex: 'v' })

    expect(el.style.getPropertyValue('--draw-halo')).toBe('a')
    expect(el.style.getPropertyValue('--draw-bg')).toBe('h')
    expect(el.style.getPropertyValue('--draw-primary')).toBe('v')
  })

  test('does nothing for a null element', () => {
    expect(() => applyTouchTargetColors(null, {})).not.toThrow()
  })
})

describe('showTouchTarget', () => {
  test('positions and shows the element', () => {
    const el = document.createElement('div')

    showTouchTarget(el, { x: 10, y: 20 })

    expect(el.style.left).toBe('10px')
    expect(el.style.top).toBe('20px')
    expect(el.style.display).toBe('block')
  })

  test('does nothing without a pixel or an element', () => {
    const el = document.createElement('div')
    showTouchTarget(el, null)
    expect(el.style.display).toBe('')

    expect(() => showTouchTarget(null, { x: 0, y: 0 })).not.toThrow()
  })
})

describe('hideTouchTarget', () => {
  test('hides the element', () => {
    const el = document.createElement('div')
    el.style.display = 'block'

    hideTouchTarget(el)

    expect(el.style.display).toBe('none')
  })

  test('does nothing for a null element', () => {
    expect(() => hideTouchTarget(null)).not.toThrow()
  })
})

describe('isOnTouchTarget', () => {
  test('returns false for a null element', () => {
    expect(isOnTouchTarget(null)).toBe(false)
  })

  test('returns false for an element without a parent', () => {
    expect(isOnTouchTarget(document.createElement('div'))).toBe(false)
  })

  test('returns true when the parent is an SVG element', () => {
    const svg = document.createElementNS(SVG_NS, 'svg')
    const circle = document.createElementNS(SVG_NS, 'circle')
    svg.appendChild(circle)

    expect(isOnTouchTarget(circle)).toBe(true)
  })

  test('returns false when the parent is a plain HTML element', () => {
    const div = document.createElement('div')
    const span = document.createElement('span')
    div.appendChild(span)

    expect(isOnTouchTarget(span)).toBe(false)
  })
})
