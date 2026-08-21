export const CheckboxGroupWrapper = ({ menuGroup, children }) => {
  if (!menuGroup.groupLabel) {
    return <>{children}</>
  }
  const wrapperClass = 'govuk-form-group im-c-menu-layers-group'
  return (
    <div key={menuGroup.id} className={wrapperClass}>
      <fieldset className='im-c-menu-layers-group__fieldset'>
        <legend className='im-c-menu-layers-group__legend'>
          <h3>
            {menuGroup.groupLabel}
          </h3>
        </legend>
        {children}
      </fieldset>
    </div>
  )
}
