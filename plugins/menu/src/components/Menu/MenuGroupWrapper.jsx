export const MenuGroupWrapper = ({ menuGroup, children }) => {
  const label = menuGroup.groupLabel || menuGroup.label
  if (!label) {
    return <>{children}</>
  }
  const wrapperClass = 'govuk-form-group im-c-menu-layers-group'
  return (
    <div key={menuGroup.id} className={wrapperClass}>
      <fieldset className='im-c-menu-layers-group__fieldset'>
        <legend className='im-c-menu-layers-group__legend'>
          <h3> {label} </h3>
        </legend>
        {children}
      </fieldset>
    </div>
  )
}
