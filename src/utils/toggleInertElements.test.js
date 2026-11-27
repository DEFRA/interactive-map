import { toggleInertElements } from './toggleInertElements'

describe('toggleInertElements', () => {
  let container, sibling1, sibling2, boundary

  beforeEach(() => {
    boundary = document.createElement('div')
    boundary.id = 'boundary'
    document.body.appendChild(boundary)

    container = document.createElement('div')
    container.id = 'container'
    boundary.appendChild(container)

    sibling1 = document.createElement('div')
    sibling1.setAttribute('data-fm-inert', '')
    sibling1.setAttribute('aria-hidden', 'true')
    boundary.appendChild(sibling1)

    sibling2 = document.createElement('div')
    sibling2.setAttribute('data-fm-inert', '')
    sibling2.setAttribute('aria-hidden', 'true')
    container.appendChild(sibling2)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('removes inert attributes from all inert elements outside container', () => {
    toggleInertElements({ containerEl: container, isFullscreen: false, boundaryEl: boundary })
    expect(sibling1.hasAttribute('data-fm-inert')).toBe(false)
    expect(sibling1.hasAttribute('aria-hidden')).toBe(false)
    // sibling2 is inside container, so should not be removed
    expect(sibling2.hasAttribute('data-fm-inert')).toBe(true)
  })

  it('adds inert attributes to siblings when fullscreen is true', () => {
    const otherSibling = document.createElement('div')
    boundary.appendChild(otherSibling)

    toggleInertElements({ containerEl: container, isFullscreen: true, boundaryEl: boundary })
    expect(otherSibling.getAttribute('aria-hidden')).toBe('true')
    expect(otherSibling.hasAttribute('data-fm-inert')).toBe(true)
  })

  it('blurs the active element when fullscreen is true', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    expect(document.activeElement).toBe(input)

    toggleInertElements({ containerEl: container, isFullscreen: true, boundaryEl: boundary })
    expect(document.activeElement).not.toBe(input)
  })

  it('keeps focus that is already inside the container when fullscreen is true', () => {
    const button = document.createElement('button')
    container.appendChild(button)
    button.focus()

    toggleInertElements({ containerEl: container, isFullscreen: true, boundaryEl: boundary })
    expect(document.activeElement).toBe(button)
  })

  it('does nothing if containerEl is null', () => {
    toggleInertElements({ containerEl: null, isFullscreen: false, boundaryEl: boundary })
    expect(sibling1.hasAttribute('data-fm-inert')).toBe(false)
    expect(sibling1.hasAttribute('aria-hidden')).toBe(false)
  })

  it('does not modify elements outside the boundary', () => {
    const outside = document.createElement('div')
    outside.setAttribute('data-fm-inert', '')
    document.body.appendChild(outside)
    toggleInertElements({ containerEl: container, isFullscreen: true, boundaryEl: boundary })
    expect(outside.hasAttribute('aria-hidden')).toBe(false)
    expect(outside.hasAttribute('data-fm-inert')).toBe(true)
  })

  it('uses document.body as default boundaryEl when not provided', () => {
    const el = document.createElement('div')
    el.setAttribute('data-fm-inert', '')
    document.body.appendChild(el)

    toggleInertElements({ containerEl: null, isFullscreen: false }) // boundaryEl omitted
    expect(el.hasAttribute('data-fm-inert')).toBe(false)
    expect(el.hasAttribute('aria-hidden')).toBe(false)
  })
})
