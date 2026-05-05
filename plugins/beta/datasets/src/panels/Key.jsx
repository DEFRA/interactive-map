import React from 'react'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'
import { mergeSublayer } from '../utils/mergeSublayer.js'
import { EmptyKey } from '../components/EmptyKey.jsx'
import { KeySvg } from '../components/KeySvg.jsx'

export const Key = ({ pluginConfig, mapState, pluginState, services }) => {
  if (!pluginState?.key?.items?.length) {
    return (<EmptyKey text={pluginConfig.noKeyItemText} />)
  }
  const { mapStyle } = mapState
  const { symbolRegistry, patternRegistry } = services

  const renderEntry = (key, config) => (
    <dl key={key} className='im-c-datasets-key__item'>
      <dt className='im-c-datasets-key__item-symbol'>
        <KeySvg {...config} symbolRegistry={symbolRegistry} patternRegistry={patternRegistry} mapStyle={mapStyle} />
      </dt>
      <dd className='im-c-datasets-key__item-label'>
        {config.label}
        {config.symbolDescription && (
          <span className='govuk-visually-hidden'>
            ({getValueForStyle(config.symbolDescription, mapStyle.id)})
          </span>
        )}
      </dd>
    </dl>
  )

  const { items: keyGroups, hasGroups } = pluginState.key
  const containerClass = `im-c-datasets-key${hasGroups ? ' im-c-datasets-key--has-groups' : ''}`

  return (
    <div className={containerClass}>
      {keyGroups.map(item => {
        if (item.type === 'sublayers') {
          const headingId = `key-heading-${item.dataset.id}`
          return (
            <section key={item.dataset.id} className='im-c-datasets-key__group' aria-labelledby={headingId}>
              <h3 id={headingId} className='im-c-datasets-key__group-heading'>{item.dataset.label}</h3>
              {item.dataset.sublayers
                .filter(sublayer => item.dataset.sublayerVisibility?.[sublayer.id] !== 'hidden')
                .map(sublayer => renderEntry(`${item.dataset.id}-${sublayer.id}`, mergeSublayer(item.dataset, sublayer)))}
            </section>
          )
        }

        if (item.type === 'group') {
          const headingId = `key-heading-${item.groupLabel.toLowerCase().replaceAll(/\s+/g, '-')}`
          return (
            <section key={item.groupLabel} className='im-c-datasets-key__group' aria-labelledby={headingId}>
              <h3 id={headingId} className='im-c-datasets-key__group-heading'>{item.groupLabel}</h3>
              {item.datasets.map(dataset => renderEntry(dataset.id, dataset))}
            </section>
          )
        }

        return renderEntry(item.dataset.id, item.dataset)
      })}
    </div>
  )
}
