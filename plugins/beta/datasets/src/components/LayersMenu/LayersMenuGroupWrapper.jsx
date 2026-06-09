export const LayersMenuGroupWrapper = ({ menuGroup, children }) => {
  if (!menuGroup.groupLabel) {
    return <>{children}</>
  }
  // TODO - is there any need for im-c-datasets-layers-group--items-checked - it isn't used anywhere
  // const anyItemsChecked = false
  // const wrapperClass = `govuk-form-group im-c-datasets-layers-group${anyItemsChecked ? ' im-c-datasets-layers-group--items-checked' : ''}`
  const wrapperClass = 'govuk-form-group im-c-datasets-layers-group'
  return (
    <div key={menuGroup.id} className={wrapperClass}>
      <fieldset className='im-c-datasets-layers-group__fieldset'>
        <legend className='im-c-datasets-layers-group__legend'>
          {menuGroup.groupLabel}
        </legend>
        {children}
      </fieldset>
    </div>
  )
}
