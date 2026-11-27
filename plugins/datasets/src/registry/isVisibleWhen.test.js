import { isVisibleWhen } from './isVisibleWhen.js'

let context

const setMenuState = (menuState) => {
  context = { menuState }
}

describe('isVisibleWhen', () => {
  beforeEach(() => {
    // reset menu state before each test
    setMenuState({})
  })

  it('returns true if visibleWhen is undefined', () => {
    expect(isVisibleWhen(undefined, context)).toBe(true)
  })

  it('returns true if visibleWhen is null', () => {
    expect(isVisibleWhen(null, context)).toBe(true)
  })

  it('returns the boolean value if visibleWhen is a boolean', () => {
    expect(isVisibleWhen(true, context)).toBe(true)
    expect(isVisibleWhen(false, context)).toBe(false)
  })

  it('returns true if all properties of visibleWhen object are satisfied', () => {
    setMenuState({ datasets: 'floodZones', timeframe: 'climateChange' })
    const visibleWhen = { menu: { datasets: ['floodZones'], timeframe: ['climateChange'] } }
    expect(isVisibleWhen(visibleWhen, context)).toBe(true)
  })

  it('returns false if any property of visibleWhen object is not satisfied', () => {
    setMenuState({ datasets: 'floodZones', timeframe: 'climateChange' })
    const visibleWhen = { menu: { datasets: ['floodZones'], timeframe: ['presentDay'] } }
    expect(isVisibleWhen(visibleWhen, context)).toBe(false)
  })

  it('returns true if mapStyleId is satisfied', () => {
    const mapStyleId = 'outdoor'
    context = { mapStyleId }
    const visibleWhen = { mapStyleId }
    expect(isVisibleWhen(visibleWhen, context)).toBe(true)
  })

  it('returns false if mapStyleId is not satisfied', () => {
    const mapStyleId = 'outdoor'
    context = { mapStyleId }
    const visibleWhen = { mapStyleId: 'dark' }
    expect(isVisibleWhen(visibleWhen, context)).toBe(false)
  })

  it('returns true if mapStyleId is an array and one of the values is satisfied', () => {
    const mapStyleId = 'outdoor'
    context = { mapStyleId }
    const visibleWhen = { mapStyleId: ['dark', mapStyleId] }
    expect(isVisibleWhen(visibleWhen, context)).toBe(true)
  })

  it('returns false if mapStyleId is an array and none of the values are satisfied', () => {
    const mapStyleId = 'outdoor'
    context = { mapStyleId }
    const visibleWhen = { mapStyleId: ['dark', 'black-and-white'] }
    expect(isVisibleWhen(visibleWhen, context)).toBe(false)
  })

  it('returns true if visibleWhen is incorrectly configured', () => {
    const visibleWhen = 'incorrectly-configured'
    expect(isVisibleWhen(visibleWhen, context)).toBe(true)
  })

  it('returns false when menu condition is checked and menuState has not been set up', () => {
    context = {} // menuState is undefined — exercises the default {}
    const visibleWhen = { menu: { datasets: ['floodZones'] } }
    expect(isVisibleWhen(visibleWhen, context)).toBe(false)
  })

  it('treats a missing context as no map style and no menu state', () => {
    expect(isVisibleWhen({ mapStyleId: 'outdoor' })).toBe(false)
    expect(isVisibleWhen({ menu: { datasets: ['floodZones'] } })).toBe(false)
    expect(isVisibleWhen({})).toBe(true)
  })
})
