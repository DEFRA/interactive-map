export const LayersMenuGroupWrapper = ({ menuGroup, children }) => {
  if (!menuGroup.groupLabel) {
    return <>{children}</>
  }
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
