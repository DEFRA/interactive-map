// src/plugins/scaleBar/ScaleBarInit.jsx
import React, { useMemo, useRef } from 'react'
import { getBestScale } from './utils.js'

const MAX_WIDTH = 120
const CSS_SCALE = 1

export function ScaleBar ({
  mapState,
  pluginConfig
}) {
  const { resolution, mapSize } = mapState
  const elRef = useRef(null)

  // useMemo to prevent scale flashing between renders
  const scale = useMemo(() => {
    if (!resolution) {
      return { width: 0, label: '', abbr: '', unit: '' }
    }

    const metersPerPx = resolution / CSS_SCALE
    return getBestScale(metersPerPx, MAX_WIDTH, pluginConfig.units, mapSize)
  }, [resolution, mapSize, pluginConfig.units])

  return (
    <div className="im-c-scale-bar" ref={elRef} style={{ width: `${scale.width}px` }}>
      <span className="im-c-scale-bar__label">
        <span className="im-u-visually-hidden">Scale bar: </span>
        {scale.label}
        <span aria-hidden="true">{scale.abbr}</span>
        <span className="im-u-visually-hidden">{scale.unit}</span>
      </span>
    </div>
  )
}
