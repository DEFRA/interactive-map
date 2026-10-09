import { initialState, actions } from './pluginState.js'

describe('initialState', () => {
  it('has the expected shape', () => {
    expect(initialState).toEqual({
      menu: [],
      menuState: {}
    })
  })
})

describe('actions.SET_MENU', () => {
  it('sets the menu on state', () => {
    const menu = [{ id: 'datasets', type: 'checkbox' }]
    const result = actions.SET_MENU(initialState, { menu })
    expect(result.menu).toBe(menu)
  })
})

describe('actions.UPDATE_MENU_STATE', () => {
  it('merges payload into menuState', () => {
    const state = { ...initialState, menuState: { datasets: 'floodZones' } }
    const result = actions.UPDATE_MENU_STATE(state, { timeframe: 'presentDay' })
    expect(result.menuState).toEqual({ datasets: 'floodZones', timeframe: 'presentDay' })
  })

  it('overwrites an existing key', () => {
    const state = { ...initialState, menuState: { datasets: 'floodZones' } }
    const result = actions.UPDATE_MENU_STATE(state, { datasets: 'riverNetwork' })
    expect(result.menuState).toEqual({ datasets: 'riverNetwork' })
  })
})
