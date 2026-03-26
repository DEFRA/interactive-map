import React from 'react'
import { showDataset } from '../api/showDataset'
import { hideDataset } from '../api/hideDataset'
import { showRule } from '../api/showRule'
import { hideRule } from '../api/hideRule'

const CHECKBOX_LABEL_CLASS = 'im-c-datasets-layers__item-label govuk-label govuk-checkboxes__label'

const hasToggleableRules = (dataset) => dataset.featureStyleRules?.some(rule => rule.toggleVisibility)

/**
 * Collapse the filtered dataset list into ordered render items:
 *   { type: 'rules', dataset }              — dataset with featureStyleRules (takes precedence)
 *   { type: 'group', groupLabel, datasets } — datasets sharing a groupLabel
 *   { type: 'flat', dataset }               — standalone dataset
 */
const buildRenderItems = (datasets) => {
  const seenGroups = new Set()
  const items = []
  datasets.forEach(dataset => {
    if (hasToggleableRules(dataset)) {
      items.push({ type: 'rules', dataset })
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
        datasets: datasets.filter(d => !hasToggleableRules(d) && d.groupLabel === dataset.groupLabel)
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
      showRule({ pluginState }, datasetId, ruleId)
    } else {
      hideRule({ pluginState }, datasetId, ruleId)
    }
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
    .filter(dataset => dataset.toggleVisibility || hasToggleableRules(dataset))

  const renderItems = buildRenderItems(visibleDatasets)
  const hasGroups = renderItems.some(item => item.type === 'rules' || item.type === 'group')
  const containerClass = `im-c-datasets-layers${hasGroups ? ' im-c-datasets-layers--has-groups' : ''}`

  return (
    <div className={containerClass}>
      {renderItems.map(item => {
        if (item.type === 'rules') {
          const { dataset } = item
          const anyRuleChecked = dataset.featureStyleRules
            .filter(rule => rule.toggleVisibility)
            .some(rule => dataset.ruleVisibility?.[rule.id] !== 'hidden')
          const wrapperClass = `govuk-form-group im-c-datasets-layers-group${anyRuleChecked ? ' im-c-datasets-layers-group--items-checked' : ''}`
          return (
            <div key={dataset.id} className={wrapperClass}>
              <fieldset className='im-c-datasets-layers-group__fieldset'>
                <legend className='im-c-datasets-layers-group__legend'>{dataset.label}</legend>
                {dataset.featureStyleRules
                  .filter(rule => rule.toggleVisibility)
                  .map(rule => {
                    const ruleVisible = dataset.ruleVisibility?.[rule.id] !== 'hidden'
                    const inputId = `${dataset.id}-${rule.id}`
                    const itemClass = `im-c-datasets-layers__item govuk-checkboxes govuk-checkboxes--small${ruleVisible ? ' im-c-datasets-layers__item--checked' : ''}`
                    return (
                      <div key={rule.id} className={itemClass} data-module='govuk-checkboxes'>
                        <div className='govuk-checkboxes__item'>
                          <input
                            className='govuk-checkboxes__input'
                            id={inputId}
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
