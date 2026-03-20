import { cleanCanvas, applyPreventDefaultFix } from './maplibreFixes.js'

describe('cleanCanvas', () => {
  it('removes and sets correct attributes on the canvas', () => {
    const canvas = document.createElement('canvas')
    canvas.setAttribute('role', 'presentation')
    canvas.setAttribute('aria-label', 'map')
    canvas.style.display = 'none'

    const map = { getCanvas: () => canvas }

    cleanCanvas(map)

    expect(canvas.hasAttribute('role')).toBe(false)
    expect(canvas.getAttribute('tabindex')).toBe('-1')
    expect(canvas.hasAttribute('aria-label')).toBe(false)
    expect(canvas.style.display).toBe('block')
  })
})

describe('applyPreventDefaultFix', () => {
  let map, canvas, spy

  beforeEach(() => {
    canvas = document.createElement('div')
    map = { getCanvas: () => canvas }
    spy = jest.spyOn(Event.prototype, 'preventDefault')
  })

  afterEach(() => {
    spy.mockRestore()
  })

  it('skips preventDefault for non-cancelable touch events on the map', () => {
    applyPreventDefaultFix(map)
    const e = new Event('touchmove', { cancelable: false })
    Object.defineProperty(e, 'target', { value: canvas })
    e.preventDefault()
    expect(spy).not.toHaveBeenCalled()
  })

  it('calls original preventDefault for events outside the map', () => {
    applyPreventDefaultFix(map)
    const e = new Event('touchstart', { cancelable: false })
    const outside = document.createElement('div')
    Object.defineProperty(e, 'target', { value: outside })
    e.preventDefault()
    expect(spy).toHaveBeenCalled()
  })

  it('calls original preventDefault for cancelable touch events on the map', () => {
    applyPreventDefaultFix(map)
    const e = new Event('touchmove', { cancelable: true }) // cancelable true
    Object.defineProperty(e, 'target', { value: canvas })
    e.preventDefault()
    expect(spy).toHaveBeenCalled()
  })

  it('calls original preventDefault for non-touch events', () => {
    applyPreventDefaultFix(map)
    const e = new Event('mousedown', { cancelable: false }) // not touch
    Object.defineProperty(e, 'target', { value: canvas })
    e.preventDefault()
    expect(spy).toHaveBeenCalled()
  })
})
