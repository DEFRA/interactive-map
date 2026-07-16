// /plugins/search/manifest.test.js
import { manifest } from './manifest.js'

describe('search manifest', () => {
  const getButton = () => manifest.buttons.find(b => b.id === 'search')

  it('declares a single search button and control', () => {
    expect(manifest.buttons).toHaveLength(1)
    expect(getButton()).toBeDefined()
    expect(manifest.controls.find(c => c.id === 'search')).toBeDefined()
  })

  it('hides the button label at every breakpoint so the shared tooltip is shown', () => {
    const btn = getButton()
    expect(btn.mobile.showLabel).toBe(false)
    expect(btn.tablet.showLabel).toBe(false)
    expect(btn.desktop.showLabel).toBe(false)
    // The accessible name / tooltip text comes from the label
    expect(btn.label).toBe('Search')
    expect(btn.iconId).toBe('search')
  })

  it('points aria-controls at the form rendered by the control', () => {
    expect(getButton().ariaControls({ appConfig: { id: 'map' } })).toBe('map-search-form')
  })

  it('excludes the trigger in default-expanded mode', () => {
    expect(getButton().excludeWhen({ pluginConfig: { expanded: true } })).toBe(true)
    expect(getButton().excludeWhen({ pluginConfig: { expanded: false } })).toBe(false)
  })

  it('keeps focus in the search rather than returning it to the map on open', () => {
    expect(getButton().keepFocus).toBe(true)
  })

  it('opens the form and emits search:open on click', () => {
    const dispatch = jest.fn()
    const emit = jest.fn()
    getButton().onClick(null, { pluginState: { dispatch }, services: { eventBus: { emit } } })
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_EXPANDED', payload: true })
    expect(emit).toHaveBeenCalledWith('search:open')
  })
})
