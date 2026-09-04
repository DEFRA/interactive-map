import { buildMenuState } from './menuStateReducer.js'

describe('buildMenuState', () => {
  const setSearch = (search) => {
    window.history.replaceState({}, '', search || window.location.pathname)
  }

  afterEach(() => {
    setSearch('')
  })

  it('returns an empty object for an empty menu', () => {
    expect(buildMenuState([])).toEqual({})
  })

  describe('radio groups', () => {
    it('uses the explicit value when set', () => {
      const menu = [{ id: 'datasets', type: 'radio', value: 'floodZones', items: [{ value: 'other' }] }]
      expect(buildMenuState(menu)).toEqual({ datasets: 'floodZones' })
    })

    it('falls back to the first item value when no value is set', () => {
      const menu = [{ id: 'datasets', type: 'radio', items: [{ value: 'floodZones' }, { value: 'other' }] }]
      expect(buildMenuState(menu)).toEqual({ datasets: 'floodZones' })
    })

    it('prefers the URL search param over the configured value', () => {
      setSearch('?datasets=other')
      const menu = [{ id: 'datasets', type: 'radio', value: 'floodZones', items: [{ value: 'other' }] }]
      expect(buildMenuState(menu)).toEqual({ datasets: 'other' })
    })

    it('handles multiple radio groups', () => {
      const menu = [
        { id: 'datasets', type: 'radio', value: 'floodZones' },
        { id: 'timeframe', type: 'radio', items: [{ value: 'presentDay' }] }
      ]
      expect(buildMenuState(menu)).toEqual({ datasets: 'floodZones', timeframe: 'presentDay' })
    })
  })

  describe('checkbox groups', () => {
    const checkboxMenu = [{
      id: 'layers',
      type: 'checkbox',
      items: [{ id: 'flood', checked: true }, { id: 'erosion', checked: false }]
    }]

    it('uses the configured checked values when the URL has no param for the group', () => {
      expect(buildMenuState(checkboxMenu)).toEqual({ flood: true, erosion: false })
    })

    it('uses the URL param to determine which checkboxes are checked', () => {
      setSearch('?layers=erosion')
      expect(buildMenuState(checkboxMenu)).toEqual({ flood: false, erosion: true })
    })

    it('supports multiple checked values in the URL param', () => {
      setSearch('?layers=flood,erosion')
      expect(buildMenuState(checkboxMenu)).toEqual({ flood: true, erosion: true })
    })
  })

  it('combines radio and checkbox groups', () => {
    const menu = [
      { id: 'layers', type: 'checkbox', items: [{ id: 'flood', checked: true }] },
      { id: 'datasets', type: 'radio', value: 'floodZones' }
    ]
    expect(buildMenuState(menu)).toEqual({ flood: true, datasets: 'floodZones' })
  })
})
