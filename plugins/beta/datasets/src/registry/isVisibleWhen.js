import { datasetRegistry } from './datasetRegistry.js'

let _menuState = {}

export const setMenuState = (menu) => {
  _menuState = {}
  menu.forEach(item => {
    if (item.type === 'radio') {
      _menuState[item.id] = item.value
    }
  })
  console.log('_menuState:', _menuState)
}

const _isVisibleWhenMenuCheck = (menuVisibleWhen) => {
  for (const [key, valueArray] of Object.entries(menuVisibleWhen)) {
    const menuValue = _menuState[key]
    if (!valueArray.includes(menuValue)) {
      return false
    }
  }
  return true
}

const _isVisibleWhenMapStyleCheck = (visibleWhenValue) => {
  const mapStylesArray = Array.isArray(visibleWhenValue) ? visibleWhenValue : [visibleWhenValue]
  return mapStylesArray.includes(_getMapStyleId())
}

// exported so it can be mocked and overridden when testing
export const _getMapStyleId = () => datasetRegistry.mapStyle.id

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
      if (visibleWhenKey === 'mapStyleId' && !_isVisibleWhenMapStyleCheck(visibleWhenValue)) {
        return false
      }
      if (visibleWhenKey === 'menu' && !_isVisibleWhenMenuCheck(visibleWhenValue)) {
        return false
      }
    }
    return true
  }
}
