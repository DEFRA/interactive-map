import { buildMenuState } from './menuStateReducer.js'

const initialState = {
  actionsArray: [],
  menu: [],
  menuState: {}
}

const updateMenuState = (state, payload) => {
  console.log('updateMenuState', { ...state.menuState, ...payload })
  return {
    ...state,
    menuState: { ...state.menuState, ...payload }
  }
}

const setMenu = (state, payload) => {
  const { menu } = payload
  // build the initial menuState for radios from the menu
  const menuState = buildMenuState(menu)
  return {
    ...state,
    menu,
    menuState
  }
}

const actions = {
  SET_MENU: setMenu,
  UPDATE_MENU_STATE: updateMenuState
}

export {
  initialState,
  actions
}
