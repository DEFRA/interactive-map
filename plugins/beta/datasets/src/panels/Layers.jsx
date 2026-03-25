import React from 'react'
import { showDataset } from '../api/showDataset'
import { hideDataset } from '../api/hideDataset'
import { showRule } from '../api/showRule'
import { hideRule } from '../api/hideRule'

const hasToggleableRules = (dataset) =>
  dataset.featureStyleRules?.some(rule => rule.toggleVisibility)

const CHECKBOX_LABEL_CLASS = 'im-c-datasets-layers__item-label govuk-label govuk-checkboxes__label'

export const Layers = ({ pluginState }) => {
  const handleDatasetChange = (e) => {
    const { value, checked } = e.target
    if (checked) {
      showDataset({ pluginState }, value)
    } else {
      hideDataset({ pluginState }, value)
    }
  }

  const handleRuleChange = (e) => {
    const { checked } = e.target
    const datasetId = e.target.dataset.datasetId
    const ruleId = e.target.dataset.ruleId
    if (checked) {
      showRule({ pluginState }, { datasetId, ruleId })
    } else {
      hideRule({ pluginState }, { datasetId, ruleId })
    }
  }

  return (
    <div className='im-c-datasets-layers'>
      <div className='govuk-form-group'>
        <fieldset className='govuk-fieldset'>
          <legend className='govuk-visually-hidden'>
            Layers
          </legend>
          <div className='govuk-checkboxes govuk-checkboxes--small' data-module='govuk-checkboxes'>
            {(pluginState.datasets || [])
              .filter(dataset => dataset.toggleVisibility || hasToggleableRules(dataset))
              .map(dataset => {
                if (hasToggleableRules(dataset)) {
                  return (
                    <div key={dataset.id} className='im-c-datasets-layers__group'>
                      <div className='im-c-datasets-layers__group-label'>{dataset.label}</div>
                      {dataset.featureStyleRules
                        .filter(rule => rule.toggleVisibility)
                        .map(rule => {
                          const ruleVisible = dataset.ruleVisibility?.[rule.id] !== 'hidden'
                          const inputId = `${dataset.id}--rule-${rule.id}`
                          const ruleItemClass = `im-c-datasets-layers__item${ruleVisible ? ' im-c-datasets-layers__item--checked' : ''}`
                          return (
                            <div key={rule.id} className={ruleItemClass}>
                              <div className='govuk-checkboxes__item'>
                                <input
                                  className='govuk-checkboxes__input'
                                  id={inputId}
                                  name='layers'
                                  type='checkbox'
                                  checked={ruleVisible}
                                  data-dataset-id={dataset.id}
                                  data-rule-id={rule.id}
                                  onChange={handleRuleChange}
                                />
                                <label className={CHECKBOX_LABEL_CLASS} htmlFor={inputId}>
                                  {rule.label}
                                </label>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )
                }

                const datasetItemClass = `im-c-datasets-layers__item${dataset.visibility === 'hidden' ? '' : ' im-c-datasets-layers__item--checked'}`
                return (
                  <div key={dataset.id} className={datasetItemClass}>
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
              })}
          </div>
        </fieldset>
      </div>
    </div>
  )
}
