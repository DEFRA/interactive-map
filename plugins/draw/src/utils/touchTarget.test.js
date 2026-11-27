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

    const element = createTouchTarget(container)

    expect(element).not.toBeNull()
    expect(element.hasAttribute('data-im-draw-touch-target')).toBe(true)
    expect(container.querySelectorAll('[data-im-draw-touch-target]')).toHaveLength(1)
  })

  test('styles the target through the element, not a style attribute in the markup', () => {
    const container = document.createElement('div')
    const insertAdjacentHTML = jest.spyOn(container, 'insertAdjacentHTML')

    const element = createTouchTarget(container)

    expect(insertAdjacentHTML.mock.calls[0][1]).not.toMatch(/style=/)
    expect(element.style.display).toBe('none')
    expect(element.style.position).toBe('absolute')
    expect(element.style.margin).toBe('24px 0px 0px -24px')
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
    const element = document.createElement('div')

    applyTouchTargetColors(element, { editActive: 'a', editHalo: 'h', editVertex: 'v' })

    expect(element.style.getPropertyValue('--draw-halo')).toBe('a')
    expect(element.style.getPropertyValue('--draw-bg')).toBe('h')
    expect(element.style.getPropertyValue('--draw-primary')).toBe('v')
  })

  test('does nothing for a null element', () => {
    expect(() => applyTouchTargetColors(null, {})).not.toThrow()
  })
})

describe('showTouchTarget', () => {
  test('positions and shows the element', () => {
    const element = document.createElement('div')

    showTouchTarget(element, { x: 10, y: 20 })

    expect(element.style.left).toBe('10px')
    expect(element.style.top).toBe('20px')
    expect(element.style.display).toBe('block')
  })

  test('does nothing without a pixel or an element', () => {
    const element = document.createElement('div')
    showTouchTarget(element, null)
    expect(element.style.display).toBe('')

    expect(() => showTouchTarget(null, { x: 0, y: 0 })).not.toThrow()
  })
})

describe('hideTouchTarget', () => {
  test('hides the element', () => {
    const element = document.createElement('div')
    element.style.display = 'block'

    hideTouchTarget(element)

    expect(element.style.display).toBe('none')
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
