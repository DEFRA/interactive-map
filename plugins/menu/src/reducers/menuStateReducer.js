// This reducer builds the initial state of the menu based on the URL
// and the default configuration that is provided for the plugin
export const buildMenuState = (menu) => {
  const url = new URL(window.location.href)
  const { searchParams } = url

  const menuState = {}
  menu.forEach(menuGroup => {
    const searchParamValue = searchParams.get(menuGroup.id)
    if (menuGroup.type === 'radio') {
      menuState[menuGroup.id] = searchParamValue || menuGroup.value || menuGroup.items?.[0].value
    } else { // checkBox
      const { items: configuredCheckboxes } = menuGroup

      // Loop through the checkbox items and set their state based on the URL or default checked value
      configuredCheckboxes.forEach(checkbox => {
        const { id: checkBoxId, checked: checkedInConfig } = checkbox
        // it should be checked if it is set to be checked in the config,
        // unless the URL specifies some values for this group
        // but not this specific one.
        const shouldBeChecked = searchParamValue ? searchParamValue.includes(checkBoxId) : checkedInConfig
        menuState[checkBoxId] = shouldBeChecked
      })
    }
  })
  return menuState
}
