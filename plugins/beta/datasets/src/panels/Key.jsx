import React from 'react'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'
import { hasPattern, getKeyPatternPaths } from '../styles/patterns.js'
import { mergeRule } from '../utils/mergeRule.js'

const SVG_SIZE = 20
const SVG_CENTER = SVG_SIZE / 2
const PATTERN_INSET = 2

const buildKeyGroups = (datasets) => {
  const seenGroups = new Set()
  const items = []
  datasets.forEach(dataset => {
    if (dataset.featureStyleRules?.length) {
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
        datasets: datasets.filter(d => !d.featureStyleRules?.length && d.groupLabel === dataset.groupLabel)
      })
      return
    }
    items.push({ type: 'flat', dataset })
  })
  return items
}

export const Key = ({ mapState, pluginState }) => {
  const { mapStyle } = mapState

  const itemSymbol = (config) => {
    const svgProps = {
      xmlns: 'http://www.w3.org/2000/svg',
      width: SVG_SIZE,
      height: SVG_SIZE,
      viewBox: `0 0 ${SVG_SIZE} ${SVG_SIZE}`,
      'aria-hidden': 'true',
      focusable: 'false'
    }

    if (hasPattern(config)) {
      const paths = getKeyPatternPaths(config, mapStyle.id)
      return (
        <svg {...svgProps}>
          <g dangerouslySetInnerHTML={{ __html: paths.border }} />
          <g transform={`translate(${PATTERN_INSET}, ${PATTERN_INSET})`} dangerouslySetInnerHTML={{ __html: paths.content }} />
        </svg>
      )
    }

    return (
      <svg {...svgProps}>
        {config.keySymbolShape === 'line'
          ? (
            <line
              x1={config.strokeWidth / 2}
              y1={SVG_CENTER}
              x2={SVG_SIZE - config.strokeWidth / 2}
              y2={SVG_CENTER}
              stroke={getValueForStyle(config.stroke, mapStyle.id)}
              strokeWidth={config.strokeWidth}
              strokeLinecap='round'
            />
            )
          : (
            <rect
              x={config.strokeWidth / 2}
              y={config.strokeWidth / 2}
              width={SVG_SIZE - config.strokeWidth}
              height={SVG_SIZE - config.strokeWidth}
              rx={config.strokeWidth}
              ry={config.strokeWidth}
              fill={getValueForStyle(config.fill, mapStyle.id)}
              stroke={getValueForStyle(config.stroke, mapStyle.id)}
              strokeWidth={config.strokeWidth}
              strokeLinejoin='round'
            />
            )}
      </svg>
    )
  }

  const renderEntry = (key, config) => (
    <dl key={key} className='im-c-datasets-key__item'>
      <dt className='im-c-datasets-key__item-symbol'>{itemSymbol(config)}</dt>
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

  const visibleDatasets = (pluginState.datasets || [])
    .filter(dataset => dataset.showInKey && dataset.visibility !== 'hidden')

  const keyGroups = buildKeyGroups(visibleDatasets)
  const hasGroups = keyGroups.some(item => item.type === 'rules' || item.type === 'group')
  const containerClass = `im-c-datasets-key${hasGroups ? ' im-c-datasets-key--has-groups' : ''}`

  return (
    <div className={containerClass}>
      {keyGroups.map(item => {
        if (item.type === 'rules') {
          const headingId = `key-heading-${item.dataset.id}`
          return (
            <section key={item.dataset.id} className='im-c-datasets-key__group' aria-labelledby={headingId}>
              <h3 id={headingId} className='im-c-datasets-key__group-heading'>{item.dataset.label}</h3>
              {item.dataset.featureStyleRules
                .filter(rule => item.dataset.ruleVisibility?.[rule.id] !== 'hidden')
                .map(rule => renderEntry(`${item.dataset.id}-${rule.id}`, mergeRule(item.dataset, rule)))}
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
