import { createMapFocus } from './mapFocus.js'

describe('createMapFocus', () => {
  let viewport
  let mapFocus

  beforeEach(() => {
    viewport = document.createElement('div')
    viewport.tabIndex = 0
    viewport.setAttribute('aria-label', 'Interactive map')
    document.body.appendChild(viewport)
    mapFocus = createMapFocus({ viewportRef: { current: viewport } })
  })

  afterEach(() => {
    viewport.remove()
  })

  it.each([
    ['pointer', true],
    ['keyboard', false]
  ])('focuses the viewport with preventScroll for %s users', (interfaceType, preventScroll) => {
    const focusSpy = jest.spyOn(viewport, 'focus')
    mapFocus = createMapFocus({ viewportRef: { current: viewport }, getInterfaceType: () => interfaceType })
    mapFocus.focus()
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll })
  })

  it('sets the name from the label', () => {
    mapFocus.setLabel('Flood map. Loading map')
    expect(viewport.getAttribute('aria-label')).toBe('Flood map. Loading map')

    mapFocus.setLabel('Flood map')
    expect(viewport.getAttribute('aria-label')).toBe('Flood map')
  })

  it('focuses the viewport without changing its name or holding announcements', () => {
    mapFocus.setLabel('Flood map')
    mapFocus.focus()
    expect(document.activeElement).toBe(viewport)
    expect(viewport.getAttribute('aria-label')).toBe('Flood map')
    expect(mapFocus.isHoldingAnnouncements()).toBe(false)
  })

  it('adds the message to the name before focusing and holds announcements', () => {
    mapFocus.setLabel('Flood map')
    let nameOnFocus
    viewport.addEventListener('focus', () => { nameOnFocus = viewport.getAttribute('aria-label') })

    mapFocus.focus({ message: 'Map moved to Carlisle' })

    expect(nameOnFocus).toBe('Flood map. Map moved to Carlisle')
    expect(document.activeElement).toBe(viewport)
    expect(mapFocus.isHoldingAnnouncements()).toBe(true)
  })

  it('releaseAnnouncements ends the hold but keeps the message', () => {
    mapFocus.setLabel('Flood map')
    mapFocus.focus({ message: 'Map moved to Carlisle' })
    mapFocus.releaseAnnouncements()
    expect(mapFocus.isHoldingAnnouncements()).toBe(false)
    expect(viewport.getAttribute('aria-label')).toBe('Flood map. Map moved to Carlisle')
  })

  it('clear removes the message and ends the hold', () => {
    mapFocus.setLabel('Flood map')
    mapFocus.focus({ message: 'Map moved to Carlisle' })
    mapFocus.focus({ message: 'Map moved to Leeds' })
    mapFocus.clear()
    expect(viewport.getAttribute('aria-label')).toBe('Flood map')
    expect(mapFocus.isHoldingAnnouncements()).toBe(false)
  })

  it('keeps a message when the label changes, and the new label when the message clears', () => {
    mapFocus.setLabel('Flood map. Loading map')
    mapFocus.focus({ message: 'Map moved to Carlisle' })

    mapFocus.setLabel('Flood map')
    expect(viewport.getAttribute('aria-label')).toBe('Flood map. Map moved to Carlisle')

    mapFocus.clear()
    expect(viewport.getAttribute('aria-label')).toBe('Flood map')
  })

  it('removes the name when there is no label or message', () => {
    mapFocus.setLabel(null)
    expect(viewport.hasAttribute('aria-label')).toBe(false)
  })

  it('copes with the viewport not being mounted', () => {
    const viewportRef = { current: null }
    mapFocus = createMapFocus({ viewportRef })
    expect(() => mapFocus.setLabel('Flood map')).not.toThrow()
    expect(() => mapFocus.focus({ message: 'Map moved to Carlisle' })).not.toThrow()
    expect(mapFocus.isHoldingAnnouncements()).toBe(false)
    expect(() => mapFocus.clear()).not.toThrow()

    // Unmounted between focus and clear
    viewportRef.current = viewport
    mapFocus.focus({ message: 'Map moved to Carlisle' })
    viewportRef.current = null
    expect(() => mapFocus.clear()).not.toThrow()
  })
})
