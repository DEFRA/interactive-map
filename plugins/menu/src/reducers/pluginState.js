const initialState = {
  menu: [],
  menuState: {}
}

const updateMenuState = (state, payload) => {
  return {
    ...state,
    menuState: { ...state.menuState, ...payload }
  }
}

const setMenu = (state, payload) => {
  const { menu, menuState } = payload
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
