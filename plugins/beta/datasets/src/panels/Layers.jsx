import React from 'react'
import { setDatasetVisibility } from '../api/setDatasetVisibility'

const CHECKBOX_LABEL_CLASS = 'im-c-datasets-layers__item-label govuk-label govuk-checkboxes__label'

const hasToggleableSublayers = (dataset) => dataset.sublayers?.some(sublayer => sublayer.showInMenu)

/**
 * Collapse the filtered dataset list into ordered render items:
 *   { type: 'sublayers', dataset }              — dataset with sublayers (takes precedence)
 *   { type: 'group', groupLabel, datasets } — datasets sharing a groupLabel
 *   { type: 'flat', dataset }               — standalone dataset
 */
const buildRenderItems = (datasets) => {
  const seenGroups = new Set()
  const items = []
  datasets.forEach(dataset => {
    if (hasToggleableSublayers(dataset)) {
      items.push({ type: 'sublayers', dataset })
      return
    }
    if (dataset.groupLabel) {
      if (seenGroups.has(dataset.groupLabel)) {
        return
      }
      seenGroups.add(dataset.groupLabel)
      items.push({
        type: 'group',
        groupLabel: dataset.groupLabel,
        datasets: datasets.filter(d => !hasToggleableSublayers(d) && d.groupLabel === dataset.groupLabel)
      })
      return
    }
    items.push({ type: 'flat', dataset })
  })
  return items
}

export const Layers = ({ pluginState }) => {
  const handleDatasetChange = (e) => {
    const { value, checked } = e.target
    setDatasetVisibility({ pluginState }, checked, { datasetId: value })
  }

  const handleSublayerChange = (e) => {
    const { checked } = e.target
    const datasetId = e.target.dataset.datasetId
    const sublayerId = e.target.dataset.sublayerId
    setDatasetVisibility({ pluginState }, checked, { datasetId, sublayerId })
  }

  const renderDatasetItem = (dataset) => {
    const itemClass = `im-c-datasets-layers__item govuk-checkboxes govuk-checkboxes--small${dataset.visibility === 'hidden' ? '' : ' im-c-datasets-layers__item--checked'}`
    return (
      <div key={dataset.id} className={itemClass} data-module='govuk-checkboxes'>
        <div className='govuk-checkboxes__item'>
          <input
            className='govuk-checkboxes__input'
            id={dataset.id}
            name='layers'
            type='checkbox'
            value={dataset.id}
            checked={dataset.visibility !== 'hidden'}
            onChange={handleDatasetChange}
          />
          <label className={CHECKBOX_LABEL_CLASS} htmlFor={dataset.id}>
            {dataset.label}
          </label>
        </div>
      </div>
    )
  }

  const visibleDatasets = (pluginState.datasets || [])
    .filter(dataset => dataset.showInMenu || hasToggleableSublayers(dataset))

  const renderItems = buildRenderItems(visibleDatasets)
  const hasGroups = renderItems.some(item => item.type === 'sublayers' || item.type === 'group')
  const containerClass = `im-c-datasets-layers${hasGroups ? ' im-c-datasets-layers--has-groups' : ''}`

  return (
    <div className={containerClass}>
      {renderItems.map(item => {
        if (item.type === 'sublayers') {
          const { dataset } = item
          const anySublayerChecked = dataset.sublayers
            .filter(sublayer => sublayer.showInMenu)
            .some(sublayer => dataset.sublayerVisibility?.[sublayer.id] !== 'hidden')
          const wrapperClass = `govuk-form-group im-c-datasets-layers-group${anySublayerChecked ? ' im-c-datasets-layers-group--items-checked' : ''}`
          return (
            <div key={dataset.id} className={wrapperClass}>
              <fieldset className='im-c-datasets-layers-group__fieldset'>
                <legend className='im-c-datasets-layers-group__legend'>{dataset.label}</legend>
                {dataset.sublayers
                  .filter(sublayer => sublayer.showInMenu)
                  .map(sublayer => {
                    const sublayerVisible = dataset.sublayerVisibility?.[sublayer.id] !== 'hidden'
                    const inputId = `${dataset.id}-${sublayer.id}`
                    const itemClass = `im-c-datasets-layers__item govuk-checkboxes govuk-checkboxes--small${sublayerVisible ? ' im-c-datasets-layers__item--checked' : ''}`
                    return (
                      <div key={sublayer.id} className={itemClass} data-module='govuk-checkboxes'>
                        <div className='govuk-checkboxes__item'>
                          <input
                            className='govuk-checkboxes__input'
                            id={inputId}
                            type='checkbox'
                            checked={sublayerVisible}
                            data-dataset-id={dataset.id}
                            data-sublayer-id={sublayer.id}
                            onChange={handleSublayerChange}
                          />
                          <label className={CHECKBOX_LABEL_CLASS} htmlFor={inputId}>
                            {sublayer.label}
                          </label>
                        </div>
                      </div>
                    )
                  })}
              </fieldset>
            </div>
          )
        }

        if (item.type === 'group') {
          const anyDatasetChecked = item.datasets.some(d => d.visibility !== 'hidden')
          const wrapperClass = `govuk-form-group im-c-datasets-layers-group${anyDatasetChecked ? ' im-c-datasets-layers-group--items-checked' : ''}`
          return (
            <div key={item.groupLabel} className={wrapperClass}>
              <fieldset className='im-c-datasets-layers-group__fieldset'>
                <legend className='im-c-datasets-layers-group__legend'>{item.groupLabel}</legend>
                {item.datasets.map(dataset => renderDatasetItem(dataset))}
              </fieldset>
            </div>
          )
        }

        return renderDatasetItem(item.dataset)
      })}
    </div>
  )
}
