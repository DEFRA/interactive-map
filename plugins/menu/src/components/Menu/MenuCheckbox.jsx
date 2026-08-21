export const MenuCheckbox = ({ dispatch, menuGroupItem, onChange, checked }) => {
  const itemClass = `im-c-menu-layers__item govuk-checkboxes govuk-checkboxes--small${checked ? '' : ' im-c-menu-layers__item--checked'}`
  const itemId = `menu-checkbox-${menuGroupItem.id}`

  const handleOnChange = event => {
    const _checked = Boolean(event.target?.checked)
    if (onChange) {
      // The menu config can optionally pass handleOnChange, which is passed in as onChange
      // and called here
      onChange(_checked)
    }
    // Also update the menu state, so any visibleWhen implementations can also handle it
    dispatch({ type: 'UPDATE_MENU_STATE', payload: { [menuGroupItem.id]: _checked } })
  }

  return (
    <div key={itemId} className={itemClass} data-module='govuk-checkboxes'>
      <div className='govuk-checkboxes__item'>
        <input
          className='govuk-checkboxes__input'
          id={itemId}
          name={itemId}
          type='checkbox'
          checked={checked}
          onChange={handleOnChange}
        />
        <label className='im-c-menu-layers__item-label govuk-label govuk-checkboxes__label' htmlFor={itemId}>
          {menuGroupItem.label}
        </label>
      </div>
    </div>
  )
}
