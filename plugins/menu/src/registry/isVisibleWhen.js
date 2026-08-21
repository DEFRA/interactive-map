let _pluginStateRef = {}
export const attachPluginStateRef = (pluginStateRef) => { _pluginStateRef = pluginStateRef }

const _isVisibleWhenMenuCheck = (menuVisibleWhen) => {
  const menuState = _pluginStateRef?.current?.menuState || {}
  for (const [key, valueArray] of Object.entries(menuVisibleWhen)) {
    const menuValue = menuState[key]
    if (!valueArray.includes(menuValue)) {
      return false
    }
  }
  return true
}

/**
 * receives a visibleWhen boolean or object
 * and returns a boolean indicating whether the dataset should be visible
 * if visibleWhen is undefined, it returns true
 * if visibleWhen is a boolean, it returns that boolean
 * if visibleWhen is an object, it checks the properties of the object, against the relevant pluginState properties,
 * and returns true if all properties are satisfied:
 * @param {boolean|object} visibleWhen - the visibleWhen property of a dataset
 * @returns {boolean} - true if the dataset should be visible, false otherwise
 */
export const isVisibleWhen = (visibleWhen) => {
  if (visibleWhen === undefined || visibleWhen === null) {
    return true
  }
  if (typeof visibleWhen === 'boolean') {
    return visibleWhen
  }
  if (typeof visibleWhen === 'object') {
    // check each property of the visibleWhen object against the relevant pluginState property
    for (const [visibleWhenKey, visibleWhenValue] of Object.entries(visibleWhen)) {
      if (visibleWhenKey === 'menu' && !_isVisibleWhenMenuCheck(visibleWhenValue)) {
        return false
      }
    }
    return true
  }
  // Fallback to true if visibleWhen is incorrectly configured
  return true
}
