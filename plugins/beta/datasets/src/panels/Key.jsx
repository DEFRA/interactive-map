import React from 'react'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle'
import { hasPattern, getKeyPatternPaths } from '../../../../../src/utils/patternUtils.js'
import { mergeSublayer } from '../utils/mergeSublayer.js'
import { hasSymbol, getSymbolDef, getSymbolStyleColors, getSymbolViewBox } from '../../../../../src/utils/symbolUtils.js'
import { EmptyKey } from './EmptyKey.jsx'

const SVG_SIZE = 20
const SVG_SYMBOL_SIZE = 38
const SVG_CENTER = SVG_SIZE / 2
const PATTERN_INSET = 2

export const Key = ({ pluginConfig, mapState, pluginState, services }) => {
  if (!pluginState?.key?.items?.length) {
    return (<EmptyKey text={pluginConfig.noKeyItemText} />)
  }
  const { mapStyle } = mapState
  const { symbolRegistry, patternRegistry } = services

  // Key symbols are rendered in the app UI panel, not on the map, so use the app color
  // scheme for halo fallback — not the map color scheme (which could differ, e.g. aerial).
  const appColorScheme = mapStyle?.appColorScheme ?? 'light'
  const keyMapStyle = mapStyle ? { ...mapStyle, mapColorScheme: appColorScheme } : mapStyle

  const itemSymbol = (config) => {
    const svgProps = {
      xmlns: 'http://www.w3.org/2000/svg',
      width: hasSymbol(config) ? SVG_SYMBOL_SIZE : SVG_SIZE,
      height: hasSymbol(config) ? SVG_SYMBOL_SIZE : SVG_SIZE,
      viewBox: `0 0 ${SVG_SIZE} ${SVG_SIZE}`,
      className: `am-c-datasets-key-symbol${hasSymbol(config) ? ' am-c-datasets-key-symbol--point' : ''}`,
      'aria-hidden': 'true',
      focusable: 'false'
    }

    if (hasSymbol(config)) {
      const symbolDef = getSymbolDef(config, symbolRegistry)
      if (symbolDef) {
        const resolvedSvg = symbolRegistry.resolve(symbolDef, getSymbolStyleColors(config), keyMapStyle)
        const viewBox = getSymbolViewBox(config, symbolDef)
        return (
          <svg {...svgProps} viewBox={viewBox}>
            <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
          </svg>
        )
      }
    }

    if (hasPattern(config)) {
      const paths = getKeyPatternPaths(config, mapStyle.id, patternRegistry)
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
