import React from "react"
import { getValueForStyle } from '../../../../src/utils/getValueForStyle'

export const Key = ({ mapState, pluginState }) => {
  const { mapStyle } = mapState

  const itemSymbol = (dataset) => (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 20 20'
      aria-hidden='true'
      focusable='false'
    >
      {dataset.keySymbolShape === 'line' ? (
        <line
          x1={dataset.strokeWidth / 2}
          y1="10"
          x2={20 - dataset.strokeWidth / 2}
          y2="10"
          stroke={getValueForStyle(dataset.stroke, mapStyle.id)}
          strokeWidth={dataset.strokeWidth}
          strokeLinecap="round"
        />
      ) : (
        <rect
          x={dataset.strokeWidth / 2}
          y={dataset.strokeWidth / 2}
          width={20 - dataset.strokeWidth}
          height={20 - dataset.strokeWidth}
          rx={dataset.strokeWidth}
          ry={dataset.strokeWidth}
          fill={getValueForStyle(dataset.fill, mapStyle.id)}
          stroke={getValueForStyle(dataset.stroke, mapStyle.id)}
          strokeWidth={dataset.strokeWidth}
          strokeLinejoin="round"
        />
      )}
    </svg>
  )

  return (
    <div className="im-c-datasets-key">
      {(pluginState.datasets || []).filter(dataset => dataset.showInKey && dataset.visibility !== 'hidden').map(dataset => (
        <div key={dataset.id} className="im-c-datasets-key__item">
          <div className="im-c-datasets-key__item-label">
            {itemSymbol(dataset)}
            {dataset.label}
            {dataset.symbolDescription && (
              <span className="govuk-visually-hidden">
                ({getValueForStyle(dataset.symbolDescription, mapStyle.id)})
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
