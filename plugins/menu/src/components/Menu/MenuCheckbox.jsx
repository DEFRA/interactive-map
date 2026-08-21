import { getDatasetRegistry } from '../../registry/index.js'

export const LayersMenuCheckbox = ({ dispatch, menuGroupItem, onChange }) => {
  const datasetRegistry = getDatasetRegistry()
  const registryDataset = datasetRegistry ? datasetRegistry.getDataset(menuGroupItem.id) : null
  if (!registryDataset) {
    return null
  }
  const datasetId = registryDataset.isSublayer ? registryDataset.parentId : registryDataset.id
  const sublayerId = registryDataset.isSublayer ? registryDataset.id : undefined
  const itemClass = `im-c-menu-layers__item govuk-checkboxes govuk-checkboxes--small${registryDataset.visible ? '' : ' im-c-menu-layers__item--checked'}`
  const handleOnChange = event => {
    const checked = Boolean(event.target?.checked)
    if (onChange) {
      // The menu config can optionally pass handleOnChange, which is passed in as onChange
      // and called here
      onChange(checked)
    }
    // Also update the menu state, so any visibleWhen implementations can also handle it
    dispatch({ type: 'UPDATE_MENU_STATE', payload: { [registryDataset.id]: checked } })
  }
  return (
    <div key={registryDataset.id} className={itemClass} data-module='govuk-checkboxes'>
      <div className='govuk-checkboxes__item'>
        <input
          className='govuk-checkboxes__input'
          id={registryDataset.id}
          data-dataset-id={datasetId}
          data-sublayer-id={sublayerId}
          name='layers'
          type='checkbox'
          value={registryDataset.id}
          checked={registryDataset.isLocallyVisible}
          onChange={handleOnChange}
        />
        <label className='im-c-menu-layers__item-label govuk-label govuk-checkboxes__label' htmlFor={registryDataset.id}>
          {registryDataset.label}
        </label>
      </div>
    </div>
  )
}
