import React from 'react'
import { MapButton } from '../MapButton/MapButton.jsx'
import { useApp } from '../../store/appContext.js'
import { useConfig } from '../../store/configContext.js'
import { useService } from '../../store/serviceContext.js'
import { resolveStepAmount } from '../../../utils/resolveNudgeStep.js'

const DIRECTIONS = [
  { id: 'panUp', verb: 'up', dx: 0, dy: -1 },
  { id: 'panDown', verb: 'down', dx: 0, dy: 1 },
  { id: 'panLeft', verb: 'left', dx: -1, dy: 0 },
  { id: 'panRight', verb: 'right', dx: 1, dy: 0 }
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
  // Matches the draw plugin's existing "Move point" (default)/"Nudge point" (Shift, small)
  // keyboard-shortcut vocabulary, so the label always describes the step size in effect.
  const actionWord = isLargeStep ? 'Move' : 'Nudge'

  const handlePan = (dx, dy, verb) => {
    const amount = resolveStepAmount(isLargeStep, nudgePanDelta, panDelta)
    mapProvider.panBy([dx * amount, dy * amount])
    announce(`${actionWord}d ${verb}`)
  }

  const handleZoom = (method, label) => {
    const amount = resolveStepAmount(isLargeStep, nudgeZoomDelta, zoomDelta)
    mapProvider[method](amount)
    announce(label)
  }

  const handleToggleStep = () => {
    dispatch({ type: 'TOGGLE_NUDGE_STEP' })
    announce(isLargeStep ? 'Nudge mode on' : 'Nudge mode off')
  }

  const containerClassName = [
    'im-c-move-control',
    !isOpen && 'im-c-move-control--collapsed'
  ].filter(Boolean).join(' ')

  return (
    <div id={`${appId}-move-control`} className={containerClassName}>
      <div role='group' aria-label='Direction controls' className='im-c-move-control__directions'>{/* NOSONAR - div with role="group" is correct for a button group */}
        {DIRECTIONS.map(({ id, verb, dx, dy }) => (
          <MapButton
            key={id}
            buttonId={id}
            label={`${actionWord} ${verb}`}
            iconId='chevron'
            onClick={() => handlePan(dx, dy, verb)}
          />
        ))}

        {/* Stable label/icon regardless of state (WAI-ARIA toggle-button pattern) —
            aria-pressed alone conveys whether nudge (small-step) mode is active. */}
        <MapButton
          buttonId='nudgeStepToggle'
          label='Nudge mode'
          iconId='turtle'
          isPressed={!isLargeStep}
          onClick={handleToggleStep}
        />
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
    </div>
  )
}
