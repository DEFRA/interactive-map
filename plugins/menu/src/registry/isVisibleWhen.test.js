import { isVisibleWhen, attachPluginStateRef } from './isVisibleWhen.js'

const setMenuState = (menuState) => {
  attachPluginStateRef({ current: { menuState } })
}

describe('isVisibleWhen', () => {
  beforeEach(() => {
    // reset menu state before each test
    setMenuState({})
  })

  it('returns true if visibleWhen is undefined', () => {
    expect(isVisibleWhen(undefined)).toBe(true)
  })

  it('returns true if visibleWhen is null', () => {
    expect(isVisibleWhen(null)).toBe(true)
  })

  it('returns the boolean value if visibleWhen is a boolean', () => {
    expect(isVisibleWhen(true)).toBe(true)
    expect(isVisibleWhen(false)).toBe(false)
  })

  it('returns true if all properties of visibleWhen object are satisfied', () => {
    setMenuState({ datasets: 'floodZones', timeframe: 'climateChange' })
    const visibleWhen = { menu: { datasets: ['floodZones'], timeframe: ['climateChange'] } }
    expect(isVisibleWhen(visibleWhen)).toBe(true)
  })

  it('returns false if any property of visibleWhen object is not satisfied', () => {
    setMenuState({ datasets: 'floodZones', timeframe: 'climateChange' })
    const visibleWhen = { menu: { datasets: ['floodZones'], timeframe: ['presentDay'] } }
    expect(isVisibleWhen(visibleWhen)).toBe(false)
  })

  it('returns true if visibleWhen is incorrectly configured', () => {
    const visibleWhen = 'incorrectly-configured'
    expect(isVisibleWhen(visibleWhen)).toBe(true)
  })

  it('falls back to false if menu state is not attached', () => {
    attachPluginStateRef(null)
    const visibleWhen = { menu: { datasets: ['floodZones'], timeframe: ['climateChange'] } }
    expect(isVisibleWhen(visibleWhen)).toBe(false)
  })
})
