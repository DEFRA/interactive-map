import { initialState, actions } from './pluginState.js'

describe('initialState', () => {
  it('has the expected shape', () => {
    expect(initialState).toEqual({
      actionsArray: [],
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

  it('builds menuState from radio groups', () => {
    const menu = [{ id: 'datasets', type: 'radio', value: 'floodZones' }]
    const result = actions.SET_MENU(initialState, { menu })
    expect(result.menuState).toEqual({ datasets: 'floodZones' })
  })

  it('produces empty menuState when there are no radio groups', () => {
    const menu = [{ id: 'layer', type: 'checkbox', value: 'a' }]
    const result = actions.SET_MENU(initialState, { menu })
    expect(result.menuState).toEqual({})
  })

  it('does not mutate the existing state', () => {
    const state = { ...initialState, actionsArray: [1] }
    const result = actions.SET_MENU(state, { menu: [] })
    expect(result.actionsArray).toEqual([1])
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

  it('does not mutate the existing state', () => {
    const state = { ...initialState, actionsArray: [1] }
    const result = actions.UPDATE_MENU_STATE(state, { datasets: 'floodZones' })
    expect(result.actionsArray).toEqual([1])
  })
})
