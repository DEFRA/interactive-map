import React from 'react'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'
import { hasPattern, getKeyPatternPaths } from '../styles/patterns.js'
import { mergeRule } from '../utils/mergeRule.js'

const SVG_SIZE = 20
const SVG_CENTER = SVG_SIZE / 2
const PATTERN_INSET = 2

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

  const itemLabel = (config) => (
    <div className='im-c-datasets-key__item-label'>
      {itemSymbol(config)}
      {config.label}
      {config.symbolDescription && (
        <span className='govuk-visually-hidden'>
          ({getValueForStyle(config.symbolDescription, mapStyle.id)})
        </span>
      )}
    </div>
  )

  // Build a flat list of { key, config } entries — one per rule for datasets
  // with featureStyleRules, or one per dataset otherwise.
  const keyEntries = (pluginState.datasets || [])
    .filter(dataset => dataset.showInKey && dataset.visibility !== 'hidden')
    .flatMap(dataset => {
      if (dataset.featureStyleRules?.length) {
        return dataset.featureStyleRules
          .filter(rule => dataset.ruleVisibility?.[rule.id] !== 'hidden')
          .map(rule => ({
            key: `${dataset.id}--rule-${rule.id}`,
            config: mergeRule(dataset, rule)
          }))
      }
      return [{ key: dataset.id, config: dataset }]
    })

  return (
    <div className='im-c-datasets-key'>
      {keyEntries.map(({ key, config }) => (
        <div key={key} className='im-c-datasets-key__item'>
          {itemLabel(config)}
        </div>
      ))}
    </div>
  )
}
