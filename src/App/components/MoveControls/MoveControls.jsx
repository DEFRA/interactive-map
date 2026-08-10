import React, { useEffect } from 'react'
import { MapButton } from '../MapButton/MapButton.jsx'
import { useApp } from '../../store/appContext.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { resolveStepAmount } from '../../../utils/resolveNudgeStep.js'

const DIRECTIONS = [
  { id: 'panUp', verb: 'up', dx: 0, dy: -1, key: 'ArrowUp' },
  { id: 'panDown', verb: 'down', dx: 0, dy: 1, key: 'ArrowDown' },
  { id: 'panLeft', verb: 'left', dx: -1, dy: 0, key: 'ArrowLeft' },
  { id: 'panRight', verb: 'right', dx: 1, dy: 0, key: 'ArrowRight' }
]

const ZOOM_ACTIONS = [
  { id: 'nudgeZoomIn', label: 'Zoom in', announceLabel: 'Zoomed in', method: 'zoomIn' },
  { id: 'nudgeZoomOut', label: 'Zoom out', announceLabel: 'Zoomed out', method: 'zoomOut' }
]

export const MoveControls = () => {
  const { id: appId, mapProvider, panDelta, nudgePanDelta, zoomDelta, nudgeZoomDelta } = useConfig()
  const { dispatch, expandedButtons, nudgeStepSize, interfaceType, layoutRefs } = useApp()
  const { isAtMaxZoom, isAtMinZoom } = useMap()
  const { announce } = useService()

  const isOpen = expandedButtons.has('moveControls')
  const firstDirectionButtonId = `${appId}-pan-up`

  useEffect(() => {
    if (isOpen) {
      document.getElementById(firstDirectionButtonId)?.focus()
    }
  }, [isOpen, firstDirectionButtonId])

  const isLargeStep = nudgeStepSize === 'large'
  // Matches the draw plugin's existing "Move point" (default)/"Nudge point" (Shift, small)
  // keyboard-shortcut vocabulary, so the label always describes the step size in effect.
  const actionWord = isLargeStep ? 'Move' : 'Nudge'

  // Registry buttons (declared via a plugin's manifest) auto-return focus to the map
  // viewport after a click (see createButtonClickHandler in mapButtons.js) unless
  // marked keepFocus — which is how e.g. draw's own toolbar buttons never leave
  // keyboard shortcuts (like arrow-key vertex nudging) stranded afterward. MoveControls
  // renders its own buttons directly, bypassing that mechanism entirely, so it has to
  // replicate the same return-to-viewport behaviour itself. But unlike a one-off
  // action button, the D-pad is meant to be pressed repeatedly — a keyboard/switch
  // user tabs to a direction button once and presses Enter/Space many times in a row,
  // which requires focus to stay put. So this only returns focus when the interface
  // type isn't 'keyboard': a mouse/touch user doesn't need retained focus to click the
  // same visible button again, and returning it immediately means they can switch to
  // arrow keys right after without an extra click into the map first.
  const returnFocusToViewport = () => {
    if (interfaceType !== 'keyboard') {
      requestAnimationFrame(() => layoutRefs.viewportRef.current?.focus())
    }
  }

  const handlePan = (dx, dy, verb, shiftKey = false) => {
    // Shift is a momentary "use the small step" override — matching the map's own
    // native keyboard shortcuts (keyboardActions.js's getPan/getZoom: "Shift held
    // selects the fine nudge amount... not a large step") — regardless of what the
    // Precision toggle currently says. Only the arrow-key path below passes a
    // shiftKey; button clicks don't, so they're unaffected and still follow the
    // toggle exactly as before. Button labels also stay toggle-only (WAI-ARIA
    // stable-name pattern) — only the actual step taken and its announcement
    // reflect a momentary Shift override.
    const effectiveIsLargeStep = shiftKey ? false : isLargeStep
    const effectiveActionWord = effectiveIsLargeStep ? 'Move' : 'Nudge'

    // Any plugin can claim the D-pad for something other than panning the map (e.g.
    // moving a selected draw vertex) by setting mapProvider.activeMoveTarget — a
    // generic { move(dx, dy, isLargeStep), label? } contract. MoveControls doesn't
    // know or care what's claiming it; it just checks for a claimant before
    // defaulting to its own panBy behaviour. Read fresh on every click rather than
    // subscribed to reactively, since it's a plain mapProvider property, not state.
    const activeMoveTarget = mapProvider.activeMoveTarget
    if (activeMoveTarget) {
      activeMoveTarget.move(dx, dy, effectiveIsLargeStep)
      const target = activeMoveTarget.label ? `${activeMoveTarget.label} ` : ''
      announce(`${effectiveActionWord}d ${target}${verb}`)
      returnFocusToViewport()
      return
    }

    const amount = resolveStepAmount(effectiveIsLargeStep, nudgePanDelta, panDelta)
    mapProvider.panBy([dx * amount, dy * amount])
    announce(`${effectiveActionWord}d ${verb}`)
    returnFocusToViewport()
  }

  const handleZoom = (method, label) => {
    const amount = resolveStepAmount(isLargeStep, nudgeZoomDelta, zoomDelta)
    mapProvider[method](amount)
    announce(label)
    returnFocusToViewport()
  }

  const handleToggleStep = () => {
    dispatch({ type: 'TOGGLE_NUDGE_STEP' })
    announce(isLargeStep ? 'Precision on' : 'Precision off')
  }

  // A keyboard user tabs to a direction button and can repeat-press Enter/Space on
  // it (see returnFocusToViewport above — focus deliberately stays put for
  // 'keyboard'), but that leaves them unable to fall back to raw arrow keys without
  // first tabbing all the way back to the map. Handling arrow keys here — while
  // focus is anywhere within this control, not just on a direction button — covers
  // that directly, without needing draw's (or the app's own) keyboard-shortcut
  // guards to special-case MoveControls' buttons. Only arrow keys are handled;
  // other shortcuts (delete/escape/undo) still require focus on the viewport,
  // which mouse/touch users already get back automatically after any click here.
  const handleContainerKeyDown = (e) => {
    const direction = DIRECTIONS.find(({ key }) => key === e.key)
    if (!direction) {
      return
    }
    e.preventDefault()
    handlePan(direction.dx, direction.dy, direction.verb, e.shiftKey)
  }

  const containerClassName = [
    'im-c-move-controls',
    !isOpen && 'im-c-move-controls--collapsed'
  ].filter(Boolean).join(' ')

  const directionsGroup = (
    <div key='directions' role='group' aria-label='Direction controls' className='im-c-move-controls__directions'>{/* NOSONAR - div with role="group" is correct for a button group */}
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
    <div key='zoom' role='group' aria-label='Zoom controls' className='im-c-move-controls__zoom'>{/* NOSONAR - div with role="group" is correct for a button group */}
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
    <div id={`${appId}-move-controls-content`} className={containerClassName} onKeyDown={handleContainerKeyDown} data-map-keyboard-scope>{/* NOSONAR - only catches arrow-key bubbling from the real, already-focusable button descendants below; the div itself needs no role/tabIndex */}
      {directionsGroup}
      {zoomGroup}
    </div>
  )
}
