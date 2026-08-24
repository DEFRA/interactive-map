import { buildMenuState } from './menuStateReducer.js'

describe('buildMenuState', () => {
  it('returns an empty object for an empty menu', () => {
    expect(buildMenuState([])).toEqual({})
  })

  it('ignores non-radio menu groups', () => {
    const menu = [{ id: 'layer', type: 'checkbox', value: 'a' }]
    expect(buildMenuState(menu)).toEqual({})
  })

  it('uses the explicit value when set', () => {
    const menu = [{ id: 'datasets', type: 'radio', value: 'floodZones', items: [{ value: 'other' }] }]
    expect(buildMenuState(menu)).toEqual({ datasets: 'floodZones' })
  })

  it('falls back to the first item value when no value is set', () => {
    const menu = [{ id: 'datasets', type: 'radio', items: [{ value: 'floodZones' }, { value: 'other' }] }]
    expect(buildMenuState(menu)).toEqual({ datasets: 'floodZones' })
  })

  it('handles multiple radio groups', () => {
    const menu = [
      { id: 'datasets', type: 'radio', value: 'floodZones' },
      { id: 'timeframe', type: 'radio', items: [{ value: 'presentDay' }] }
    ]
    expect(buildMenuState(menu)).toEqual({ datasets: 'floodZones', timeframe: 'presentDay' })
  })

  it('mixes radio and non-radio groups, only including radios', () => {
    const menu = [
      { id: 'layer', type: 'checkbox', value: 'a' },
      { id: 'datasets', type: 'radio', value: 'floodZones' }
    ]
    expect(buildMenuState(menu)).toEqual({ datasets: 'floodZones' })
  })
})
