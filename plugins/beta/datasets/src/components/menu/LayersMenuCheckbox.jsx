import { datasetRegistry } from '../../registry/datasetRegistry.js'

export const LayersMenuCheckbox = ({ menuGroupItem, onChange }) => {
  const registryDataset = datasetRegistry.getDataset(menuGroupItem.id)
  if (!registryDataset) {
    return null
  }
  const datasetId = registryDataset.isSublayer ? registryDataset.parentId : registryDataset.id
  const sublayerId = registryDataset.isSublayer ? registryDataset.id : undefined

  const itemClass = `im-c-datasets-layers__item govuk-checkboxes govuk-checkboxes--small${registryDataset.visible ? '' : ' im-c-datasets-layers__item--checked'}`
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
          checked={registryDataset.visible}
          onChange={onChange}
        />
        <label className='im-c-datasets-layers__item-label govuk-label govuk-checkboxes__label' htmlFor={registryDataset.id}>
          {registryDataset.label}
        </label>
      </div>
    </div>
  )
}
