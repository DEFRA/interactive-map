import React, { useEffect, useRef } from 'react'
import { MapButton } from '../MapButton/MapButton.jsx'
import { useApp } from '../../store/appContext.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
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
  const { dispatch, expandedButtons, hiddenButtons, nudgeStepSize } = useApp()
  const { isAtMaxZoom, isAtMinZoom } = useMap()
  const { announce } = useService()

  const isOpen = expandedButtons.has('moveControl')
  const isTriggerHidden = hiddenButtons.has('moveControl')
  const triggerId = `${appId}-move-control`
  const firstDirectionButtonId = `${appId}-pan-up`

  // The trigger button is hidden via hiddenWhen (appConfig.js) while the control is
  // open — display:none, so it's correctly removed from the tab order — rather than
  // unmounted, so it's still there (once un-hidden) to receive focus back on close.
  // hiddenWhen is evaluated by the app-wide useButtonStateEvaluator on its own pass, one
  // render behind the expandedButtons change that drives it, so returning focus after
  // close can't happen synchronously in the click handler — it has to wait for
  // isTriggerHidden to actually flip back, which this effect tracks via a pending flag.
  const pendingFocusReturnRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      document.getElementById(firstDirectionButtonId)?.focus()
      return
    }
    if (pendingFocusReturnRef.current && !isTriggerHidden) {
      pendingFocusReturnRef.current = false
      document.getElementById(triggerId)?.focus()
    }
  }, [isOpen, isTriggerHidden, firstDirectionButtonId, triggerId])

  const handleHide = () => {
    pendingFocusReturnRef.current = true
    dispatch({ type: 'TOGGLE_BUTTON_EXPANDED', payload: { id: 'moveControl', isExpanded: false } })
  }
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
    announce(isLargeStep ? 'Precision on' : 'Precision off')
  }

  const containerClassName = [
    'im-c-move-control',
    !isOpen && 'im-c-move-control--collapsed'
  ].filter(Boolean).join(' ')

  const directionsGroup = (
    <div key='directions' role='group' aria-label='Direction controls' className='im-c-move-control__directions'>{/* NOSONAR - div with role="group" is correct for a button group */}
      {DIRECTIONS.map(({ id, verb, dx, dy }) => (
        <MapButton
          key={id}
          buttonId={id}
          label={`${actionWord} ${verb}`}
          iconId='chevron'
          onClick={() => handlePan(dx, dy, verb)}
        />
      ))}

      {/* Stable accessible name regardless of state (WAI-ARIA toggle-button pattern) —
          aria-pressed alone conveys state to assistive tech. The (On)/(Off) suffix is
          aria-hidden so it's excluded from the computed name (avoiding a duplicate
          announcement alongside aria-pressed) but still visible in the tooltip for
          sighted users. The icon itself is a decorative refinement of the same shape
          (longer ticks + a centre dot when active), not a different icon/concept, so
          it doesn't carry any of the meaning aria-pressed already conveys on its own. */}
      <MapButton
        buttonId='nudgeStepToggle'
        label={<>Precision <span aria-hidden='true'>({isLargeStep ? 'Off' : 'On'})</span></>}
        iconId={isLargeStep ? 'precision' : 'precision-active'}
        isPressed={!isLargeStep}
        onClick={handleToggleStep}
      />
    </div>
  )

  const zoomGroup = (
    <div key='zoom' role='group' aria-label='Zoom controls' className='im-c-move-control__zoom'>{/* NOSONAR - div with role="group" is correct for a button group */}
      {ZOOM_ACTIONS.map(({ id, label, announceLabel, method }) => (
        <MapButton
          key={id}
          buttonId={id}
          label={label}
          iconId={method === 'zoomIn' ? 'plus' : 'minus'}
          isDisabled={method === 'zoomIn' ? isAtMaxZoom : isAtMinZoom}
          onClick={() => handleZoom(method, announceLabel)}
        />
      ))}
    </div>
  )

  return (
    <div id={`${appId}-move-control-content`} className={containerClassName}>
      {directionsGroup}
      {zoomGroup}
      <MapButton
        buttonId='moveControlHide'
        label='Hide move and zoom controls'
        iconId='chevron'
        onClick={handleHide}
      />
    </div>
  )
}
