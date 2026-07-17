import React from 'react'
import { MapButton } from '../MapButton/MapButton.jsx'
import { useApp } from '../../store/appContext.js'
import { useConfig } from '../../store/configContext.js'
import { useService } from '../../store/serviceContext.js'
import { resolveStepAmount } from '../../../utils/resolveNudgeStep.js'

const DIRECTIONS = [
  { id: 'panUp', label: 'Pan up', announceLabel: 'Panned up', dx: 0, dy: -1 },
  { id: 'panDown', label: 'Pan down', announceLabel: 'Panned down', dx: 0, dy: 1 },
  { id: 'panLeft', label: 'Pan left', announceLabel: 'Panned left', dx: -1, dy: 0 },
  { id: 'panRight', label: 'Pan right', announceLabel: 'Panned right', dx: 1, dy: 0 }
]

const ZOOM_ACTIONS = [
  { id: 'nudgeZoomIn', label: 'Zoom in', announceLabel: 'Zoomed in', method: 'zoomIn' },
  { id: 'nudgeZoomOut', label: 'Zoom out', announceLabel: 'Zoomed out', method: 'zoomOut' }
]

export const MoveControl = () => {
  const { id: appId, mapProvider, panDelta, nudgePanDelta, zoomDelta, nudgeZoomDelta } = useConfig()
  const { dispatch, expandedButtons, nudgeStepSize } = useApp()
  const { announce } = useService()

  const isOpen = expandedButtons.has('moveControl')
  const isLargeStep = nudgeStepSize === 'large'

  const handlePan = (dx, dy, label) => {
    const amount = resolveStepAmount(isLargeStep, nudgePanDelta, panDelta)
    mapProvider.panBy([dx * amount, dy * amount])
    announce(label)
  }

  const handleZoom = (method, label) => {
    const amount = resolveStepAmount(isLargeStep, nudgeZoomDelta, zoomDelta)
    mapProvider[method](amount)
    announce(label)
  }

  const handleToggleStep = () => {
    dispatch({ type: 'TOGGLE_NUDGE_STEP' })
    announce(isLargeStep ? 'Small step' : 'Large step')
  }

  const containerClassName = [
    'im-c-move-control',
    !isOpen && 'im-c-move-control--collapsed'
  ].filter(Boolean).join(' ')

  return (
    <div id={`${appId}-move-control`} className={containerClassName}>
      <div role='group' aria-label='Pan controls' className='im-c-move-control__directions'>{/* NOSONAR - div with role="group" is correct for a button group */}
        {DIRECTIONS.map(({ id, label, announceLabel, dx, dy }) => (
          <MapButton
            key={id}
            buttonId={id}
            label={label}
            iconId='chevron'
            onClick={() => handlePan(dx, dy, announceLabel)}
          />
        ))}
      </div>

      <div role='group' aria-label='Zoom controls' className='im-c-move-control__zoom'>{/* NOSONAR - div with role="group" is correct for a button group */}
        {ZOOM_ACTIONS.map(({ id, label, announceLabel, method }) => (
          <MapButton
            key={id}
            buttonId={id}
            label={label}
            iconId={method === 'zoomIn' ? 'plus' : 'minus'}
            onClick={() => handleZoom(method, announceLabel)}
          />
        ))}
      </div>

      <MapButton
        buttonId='nudgeStepToggle'
        label={isLargeStep ? 'Large step' : 'Small step'}
        showLabel
        isPressed={isLargeStep}
        onClick={handleToggleStep}
      />
    </div>
  )
}
