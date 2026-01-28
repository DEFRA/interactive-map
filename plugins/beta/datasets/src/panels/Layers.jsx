import React from 'react'
import { showDataset } from '../api/showDataset'
import { hideDataset } from '../api/hideDataset'

export const Layers = ({ pluginState, mapProvider }) => {

  const handleChange = (e) => {
    const { value, checked } = e.target
    if (checked) {
      showDataset({ mapProvider, pluginState }, value)
    } else {
      hideDataset({ mapProvider, pluginState }, value)
    }
  }

  return (
    <div className="im-c-datasets-layers">
      <div className="govuk-form-group">
        <fieldset className="govuk-fieldset">
          <legend className="govuk-visually-hidden">
            Layers
          </legend>
          <div className="govuk-checkboxes govuk-checkboxes--small" data-module="govuk-checkboxes">
            {(pluginState.datasets || []).filter(dataset => dataset.showInLayers).map(dataset => (
              <div key={dataset.id} className={`im-c-datasets-layers__item${dataset.visibility !== 'hidden' ? ' im-c-datasets-layers__item--checked' : ''}`}>
                <div className="govuk-checkboxes__item">
                  <input className="govuk-checkboxes__input" id={dataset.id} name="layers" type="checkbox" value={dataset.id} checked={dataset.visibility !== 'hidden'} onChange={handleChange} />
                  <label className="im-c-datasets-layers__item-label govuk-label govuk-checkboxes__label" htmlFor={dataset.id}>
                    {dataset.label}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  )
}
