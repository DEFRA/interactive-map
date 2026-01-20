import { createButton } from './buttonManager.js'
import defaults from '../config/defaults.js'

describe('createButton', () => {
  let rootEl, handleClick, button

  beforeEach(() => {
    // Reset the URL before each test
    window.history.replaceState({}, '', '/test?foo=bar')
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    handleClick = jest.fn()
    jest.spyOn(history, 'pushState').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('creates button with correct attributes and inserts before rootEl', () => {
    const config = { id: 'map', buttonText: 'View Map', buttonClass: 'custom-btn' }
    button = createButton(config, rootEl, handleClick)

    const expectedHref = new URL(window.location.href)
    expectedHref.searchParams.set(defaults.mapViewParamKey, 'map')

    expect(button).toBeInstanceOf(HTMLAnchorElement)
    expect(button.getAttribute('href')).toBe(expectedHref.toString())
    expect(button.className).toBe('custom-btn')
    expect(button.getAttribute('role')).toBe('button')
    expect(button.textContent).toContain('View Map')
    expect(button.nextElementSibling).toBe(rootEl)
  })

  it('prevents default and calls handleClick on click', () => {
    const config = { id: 'map', buttonText: 'View Map', buttonClass: 'custom-btn' }
    button = createButton(config, rootEl, handleClick)

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault')

    button.dispatchEvent(clickEvent)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('builds href with map param and preserves existing query params', () => {
    const config = { id: 'map', buttonText: 'View Map', buttonClass: 'custom-btn' }
    button = createButton(config, rootEl, handleClick)

    const url = new URL(button.getAttribute('href'))
    expect(url.searchParams.get('foo')).toBe('bar') // existing param preserved
    expect(url.searchParams.get(defaults.mapViewParamKey)).toBe('map') // new param added
  })

  it('sets correct href even when no existing query params', () => {
    window.history.replaceState({}, '', '/test') // no query
    const config = { id: 'map', buttonText: 'View Map', buttonClass: 'custom-btn' }
    button = createButton(config, rootEl, handleClick)

    const url = new URL(button.getAttribute('href'))
    expect(url.pathname).toBe('/test')
    expect(url.searchParams.get(defaults.mapViewParamKey)).toBe('map')
  })
})
