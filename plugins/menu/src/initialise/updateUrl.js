import { isVisibleWhen } from '../registry/isVisibleWhen.js'

const _setRadioParam = (item, menuState, searchParams) => {
  const { id: paramId } = item
  const paramValue = menuState[paramId]
  searchParams.set(paramId, paramValue)
}

const _setCheckBoxParameters = (item, menuState, searchParams) => {
  const { id: paramId, items: checkboxes } = item
  const paramValues = []
  checkboxes.forEach(subItem => {
    const { id: checkBoxId } = subItem
    const checked = menuState[checkBoxId]
    if (checked) {
      paramValues.push(checkBoxId)
    }
  })
  if (paramValues.length) {
    searchParams.set(paramId, paramValues)
  } else {
    searchParams.delete(paramId)
  }
}

export const updateUrl = (pluginState) => {
  const url = new URL(window.location.href)
  const { searchParams } = url
  const { menu, menuState } = pluginState
  menu.forEach(item => {
    const { id: paramId, visibleWhen, type } = item
    if (!isVisibleWhen(visibleWhen)) {
      searchParams.delete(paramId)
      return
    }
    if (type === 'radio') {
      _setRadioParam(item, menuState, searchParams)
    } else {
      _setCheckBoxParameters(item, menuState, searchParams)
    }
  })
  url.search = decodeURIComponent(url.search)
  window.history.replaceState({}, '', url.toString())
}
