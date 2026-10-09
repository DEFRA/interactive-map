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

  it('focuses the viewport without changing its name or holding announcements', () => {
    mapFocus.focus()
    expect(document.activeElement).toBe(viewport)
    expect(viewport.getAttribute('aria-label')).toBe('Interactive map')
    expect(mapFocus.isHoldingAnnouncements()).toBe(false)
  })

  it('replaces the name with the message before focusing and holds announcements', () => {
    viewport.addEventListener('focus', () => {
      expect(viewport.getAttribute('aria-label')).toBe('Map moved to Carlisle')
    })
    mapFocus.focus({ message: 'Map moved to Carlisle' })
    expect(document.activeElement).toBe(viewport)
    expect(mapFocus.isHoldingAnnouncements()).toBe(true)
  })

  it('releaseAnnouncements ends the hold but keeps the message', () => {
    mapFocus.focus({ message: 'Map moved to Carlisle' })
    mapFocus.releaseAnnouncements()
    expect(mapFocus.isHoldingAnnouncements()).toBe(false)
    expect(viewport.getAttribute('aria-label')).toBe('Map moved to Carlisle')
  })

  it('clear restores the original name and ends the hold', () => {
    mapFocus.focus({ message: 'Map moved to Carlisle' })
    mapFocus.focus({ message: 'Map moved to Leeds' })
    mapFocus.clear()
    expect(viewport.getAttribute('aria-label')).toBe('Interactive map')
    expect(mapFocus.isHoldingAnnouncements()).toBe(false)
  })

  it('clear leaves the name alone when no message was set', () => {
    viewport.setAttribute('aria-label', 'Changed by the app')
    mapFocus.clear()
    expect(viewport.getAttribute('aria-label')).toBe('Changed by the app')
  })

  it('clear removes the name again when the viewport had none', () => {
    viewport.removeAttribute('aria-label')
    mapFocus.focus({ message: 'Map moved to Carlisle' })
    mapFocus.clear()
    expect(viewport.hasAttribute('aria-label')).toBe(false)
  })

  it('copes with the viewport not being mounted', () => {
    const viewportRef = { current: null }
    mapFocus = createMapFocus({ viewportRef })
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
