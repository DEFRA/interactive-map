import React from 'react'
import { RadioGroupWrapper } from './RadioGroupWrapper.jsx'
import { CheckboxGroupWrapper } from './CheckboxGroupWrapper.jsx'

export const MenuGroup = ({ menuGroup, dispatch, menuState }) => {
  if (menuGroup.type === 'checkbox') {
    return (<CheckboxGroupWrapper menuGroup={menuGroup} dispatch={dispatch} menuState={menuState} />)
  } else {
    return (<RadioGroupWrapper menuGroup={menuGroup} dispatch={dispatch} menuState={menuState} />)
  }
}
