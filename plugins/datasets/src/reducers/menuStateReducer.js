export const buildMenuState = (menu) => {
  const menuState = {}
  menu.forEach(menuGroup => {
    if (menuGroup.type === 'radio') {
      menuState[menuGroup.id] = menuGroup.value || menuGroup.items?.[0].value
    }
  })
  return menuState
}
