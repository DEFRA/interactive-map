import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoveControls } from './MoveControls.jsx'
import { useApp } from '../../store/appContext.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'

jest.mock('../../store/appContext.js', () => ({ useApp: jest.fn() }))
jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/mapContext.js', () => ({ useMap: jest.fn() }))
jest.mock('../../store/serviceContext.js', () => ({ useService: jest.fn() }))

describe('MoveControls', () => {
  let dispatch
  let mapProvider
  let announce

  // MapButton and Tooltip also read from useApp() (buttonRefs, interfaceType), so every
  // mockReturnValue needs to carry these alongside the fields MoveControls itself reads.
  const buildAppState = (overrides) => ({
    buttonRefs: { current: {} },
    interfaceType: 'mouse',
    breakpoint: 'desktop',
    dispatch,
    expandedButtons: new Set(['moveControls']),
    nudgeStepSize: 'large',
    layoutRefs: { viewportRef: { current: { focus: jest.fn() } } },
    ...overrides
  })

  beforeEach(() => {
    dispatch = jest.fn()
    mapProvider = { panBy: jest.fn(), zoomIn: jest.fn(), zoomOut: jest.fn() }
    announce = jest.fn()

    useConfig.mockReturnValue({
      id: 'im',
      mapProvider,
      panDelta: 100,
      nudgePanDelta: 5,
      zoomDelta: 1,
      nudgeZoomDelta: 0.1
    })
    useApp.mockReturnValue(buildAppState())
    useMap.mockReturnValue({ isAtMaxZoom: false, isAtMinZoom: false })
    useService.mockReturnValue({ announce })
  })

  afterEach(() => jest.clearAllMocks())

  it('renders with the id matching the trigger button aria-controls value', () => {
    const { container } = render(<MoveControls />)
    expect(container.querySelector('#im-move-controls-content')).toBeInTheDocument()
  })

  it('is not visually collapsed when moveControls is expanded', () => {
    const { container } = render(<MoveControls />)
    expect(container.querySelector('.im-c-move-controls--collapsed')).not.toBeInTheDocument()
  })

  it('moves focus to the first direction button when the control opens', () => {
    const { rerender } = render(<MoveControls />)
    useApp.mockReturnValue(buildAppState({ expandedButtons: new Set() }))
    rerender(<MoveControls />)

    useApp.mockReturnValue(buildAppState({ expandedButtons: new Set(['moveControls']) }))
    rerender(<MoveControls />)
    expect(screen.getByRole('button', { name: 'Move up' })).toHaveFocus()
  })

  it('renders the directions group before the zoom group at every breakpoint', () => {
    ['mobile', 'tablet', 'desktop'].forEach(breakpoint => {
      useApp.mockReturnValue(buildAppState({ breakpoint }))
      const { container, unmount } = render(<MoveControls />)
      const groups = container.querySelectorAll('[role="group"]')
      expect(groups[0]).toHaveAttribute('aria-label', 'Direction controls')
      expect(groups[1]).toHaveAttribute('aria-label', 'Zoom controls')
      unmount()
    })
  })

  it('is collapsed when moveControls is not expanded', () => {
    useApp.mockReturnValue(buildAppState({ expandedButtons: new Set() }))
    const { container } = render(<MoveControls />)
    expect(container.querySelector('.im-c-move-controls--collapsed')).toBeInTheDocument()
  })

  it('labels direction buttons "Move" and pans by the large delta by default', () => {
    render(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
    expect(mapProvider.panBy).toHaveBeenCalledWith([100, 0])
    expect(announce).toHaveBeenCalledWith('Moved right')
  })

  it('labels direction buttons "Nudge" and pans by the small delta when nudgeStepSize is small', () => {
    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    render(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Nudge up' }))
    expect(mapProvider.panBy).toHaveBeenCalledWith([0, -5])
    expect(announce).toHaveBeenCalledWith('Nudged up')
  })

  it('routes direction clicks to mapProvider.activeMoveTarget instead of panning, when a plugin has claimed it', () => {
    mapProvider.activeMoveTarget = { move: jest.fn(), label: 'vertex' }
    render(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
    expect(mapProvider.activeMoveTarget.move).toHaveBeenCalledWith(1, 0, true)
    expect(mapProvider.panBy).not.toHaveBeenCalled()
    expect(announce).toHaveBeenCalledWith('Moved vertex right')
  })

  it('falls back to panning once activeMoveTarget is released', () => {
    mapProvider.activeMoveTarget = { move: jest.fn(), label: 'vertex' }
    const { rerender } = render(<MoveControls />)
    mapProvider.activeMoveTarget = null
    rerender(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
    expect(mapProvider.panBy).toHaveBeenCalledWith([100, 0])
  })

  it('omits the target label from the announcement when activeMoveTarget has none', () => {
    mapProvider.activeMoveTarget = { move: jest.fn() }
    render(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    expect(announce).toHaveBeenCalledWith('Moved up')
  })

  it('zooms in and out by the large delta by default and announces the action', () => {
    render(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(mapProvider.zoomIn).toHaveBeenCalledWith(1)
    expect(announce).toHaveBeenCalledWith('Zoomed in')

    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(mapProvider.zoomOut).toHaveBeenCalledWith(1)
    expect(announce).toHaveBeenCalledWith('Zoomed out')
  })

  it('zooms by the small delta when nudgeStepSize is small', () => {
    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    render(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(mapProvider.zoomIn).toHaveBeenCalledWith(0.1)
  })

  it('disables the zoom in button at max zoom, and zoom out at min zoom', () => {
    useMap.mockReturnValue({ isAtMaxZoom: true, isAtMinZoom: false })
    const { rerender } = render(<MoveControls />)
    expect(screen.getByRole('button', { name: 'Zoom in' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Zoom out' })).not.toHaveAttribute('aria-disabled')

    useMap.mockReturnValue({ isAtMaxZoom: false, isAtMinZoom: true })
    rerender(<MoveControls />)
    expect(screen.getByRole('button', { name: 'Zoom in' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('button', { name: 'Zoom out' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not zoom when the relevant button is disabled at max/min zoom', () => {
    useMap.mockReturnValue({ isAtMaxZoom: true, isAtMinZoom: true })
    render(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(mapProvider.zoomIn).not.toHaveBeenCalled()
    expect(mapProvider.zoomOut).not.toHaveBeenCalled()
  })

  describe('returning focus to the viewport after a click', () => {
    let rafSpy

    beforeEach(() => {
      rafSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(cb => { cb(); return 1 })
    })

    afterEach(() => rafSpy.mockRestore())

    it('returns focus to the viewport after panning on mouse/touch, so arrow-key shortcuts elsewhere are not left stranded on the D-pad button', () => {
      const appState = buildAppState({ interfaceType: 'mouse' })
      useApp.mockReturnValue(appState)
      render(<MoveControls />)

      fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
      expect(appState.layoutRefs.viewportRef.current.focus).toHaveBeenCalled()
    })

    it('keeps focus on the button when driven by keyboard, so repeated Enter/Space presses do not require re-tabbing', () => {
      useApp.mockReturnValue(buildAppState({ interfaceType: 'keyboard' }))
      render(<MoveControls />)
      fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
      expect(rafSpy).not.toHaveBeenCalled()
    })

    it('also returns focus after zooming on mouse/touch, but not on keyboard', () => {
      useApp.mockReturnValue(buildAppState({ interfaceType: 'mouse' }))
      const { rerender } = render(<MoveControls />)
      fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
      expect(rafSpy).toHaveBeenCalledTimes(1)

      useApp.mockReturnValue(buildAppState({ interfaceType: 'keyboard' }))
      rerender(<MoveControls />)
      fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
      expect(rafSpy).toHaveBeenCalledTimes(1)
    })

    it('also returns focus after a vertex nudge via activeMoveTarget on mouse/touch', () => {
      mapProvider.activeMoveTarget = { move: jest.fn(), label: 'vertex' }
      useApp.mockReturnValue(buildAppState({ interfaceType: 'touch' }))
      render(<MoveControls />)
      fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
      expect(rafSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('arrow keys while focus is anywhere within the control', () => {
    // A keyboard user who tabs to a direction button and repeat-presses Enter keeps
    // focus there (see the describe block above) — this lets them fall back to raw
    // arrow keys without first tabbing all the way back out to the map.
    it('pans the map on an arrow key, regardless of which button currently has focus', () => {
      useApp.mockReturnValue(buildAppState({ interfaceType: 'keyboard' }))
      render(<MoveControls />)
      // Focus a button unrelated to the direction being pressed, to prove this
      // isn't just reading the focused button's own handler.
      fireEvent.focus(screen.getByRole('button', { name: 'Zoom in' }))
      fireEvent.keyDown(screen.getByRole('button', { name: 'Zoom in' }), { key: 'ArrowRight' })
      expect(mapProvider.panBy).toHaveBeenCalledWith([100, 0])
      expect(announce).toHaveBeenCalledWith('Moved right')
    })

    it('routes the arrow key through activeMoveTarget when a plugin has claimed the control', () => {
      mapProvider.activeMoveTarget = { move: jest.fn(), label: 'vertex' }
      useApp.mockReturnValue(buildAppState({ interfaceType: 'keyboard' }))
      render(<MoveControls />)
      fireEvent.keyDown(screen.getByRole('button', { name: 'Move up' }), { key: 'ArrowUp' })
      expect(mapProvider.activeMoveTarget.move).toHaveBeenCalledWith(0, -1, true)
      expect(mapProvider.panBy).not.toHaveBeenCalled()
    })

    it('ignores non-arrow keys, leaving default behaviour (e.g. Enter/Space activating the focused button) untouched', () => {
      useApp.mockReturnValue(buildAppState({ interfaceType: 'keyboard' }))
      render(<MoveControls />)
      fireEvent.keyDown(screen.getByRole('button', { name: 'Move up' }), { key: 'Enter' })
      expect(mapProvider.panBy).not.toHaveBeenCalled()
    })

    it('shift+arrow overrides the Precision toggle to the small step, matching the map\'s own native keyboard shortcuts', () => {
      useApp.mockReturnValue(buildAppState({ interfaceType: 'keyboard', nudgeStepSize: 'large' }))
      render(<MoveControls />)
      fireEvent.keyDown(screen.getByRole('button', { name: 'Move right' }), { key: 'ArrowRight', shiftKey: true })
      expect(mapProvider.panBy).toHaveBeenCalledWith([5, 0])
      expect(announce).toHaveBeenCalledWith('Nudged right')
    })

    it('shift+arrow still resolves to the small step when Precision is already on (idempotent, not a toggle-relative flip)', () => {
      useApp.mockReturnValue(buildAppState({ interfaceType: 'keyboard', nudgeStepSize: 'small' }))
      render(<MoveControls />)
      fireEvent.keyDown(screen.getByRole('button', { name: 'Nudge right' }), { key: 'ArrowRight', shiftKey: true })
      expect(mapProvider.panBy).toHaveBeenCalledWith([5, 0])
      expect(announce).toHaveBeenCalledWith('Nudged right')
    })

    it('shift+arrow overrides activeMoveTarget.move to the small step too', () => {
      mapProvider.activeMoveTarget = { move: jest.fn(), label: 'vertex' }
      useApp.mockReturnValue(buildAppState({ interfaceType: 'keyboard', nudgeStepSize: 'large' }))
      render(<MoveControls />)
      fireEvent.keyDown(screen.getByRole('button', { name: 'Move up' }), { key: 'ArrowUp', shiftKey: true })
      expect(mapProvider.activeMoveTarget.move).toHaveBeenCalledWith(0, -1, false)
    })

    it('arrow key without shift still follows the Precision toggle as before', () => {
      useApp.mockReturnValue(buildAppState({ interfaceType: 'keyboard', nudgeStepSize: 'large' }))
      render(<MoveControls />)
      fireEvent.keyDown(screen.getByRole('button', { name: 'Move right' }), { key: 'ArrowRight' })
      expect(mapProvider.panBy).toHaveBeenCalledWith([100, 0])
      expect(announce).toHaveBeenCalledWith('Moved right')
    })
  })

  it('has a stable "Precision" label regardless of state', () => {
    const { rerender } = render(<MoveControls />)
    expect(screen.getByRole('button', { name: 'Precision' })).toBeInTheDocument()

    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    rerender(<MoveControls />)
    expect(screen.getByRole('button', { name: 'Precision' })).toBeInTheDocument()
  })

  it('shows an aria-hidden (On)/(Off) suffix in the tooltip without affecting the accessible name', () => {
    // The (On)/(Off) suffix lives in the Tooltip's content div (a sibling of the
    // <button>, referenced via aria-labelledby), not inside the button itself. Several
    // tooltips exist in the DOM (one per icon-only button), so resolve this button's
    // own tooltip via its aria-labelledby id rather than grabbing the first one.
    const getOwnTooltip = () => {
      const button = screen.getByRole('button', { name: 'Precision' })
      return document.getElementById(button.getAttribute('aria-labelledby'))
    }

    const { rerender } = render(<MoveControls />)
    let tooltip = getOwnTooltip()
    expect(tooltip.querySelector('[aria-hidden="true"]')).toHaveTextContent('(Off)')
    expect(tooltip).toHaveTextContent('Precision (Off)')

    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    rerender(<MoveControls />)
    tooltip = getOwnTooltip()
    expect(tooltip.querySelector('[aria-hidden="true"]')).toHaveTextContent('(On)')
    expect(tooltip).toHaveTextContent('Precision (On)')
  })

  it('reflects precision mode via aria-pressed, not via label changes', () => {
    const { rerender } = render(<MoveControls />)
    expect(screen.getByRole('button', { name: 'Precision' })).toHaveAttribute('aria-pressed', 'false')

    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    rerender(<MoveControls />)
    expect(screen.getByRole('button', { name: 'Precision' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles precision on and announces it when currently in large-step mode', () => {
    render(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Precision' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_NUDGE_STEP' })
    expect(announce).toHaveBeenCalledWith('Precision on')
  })

  it('toggles precision off and announces it when currently in small-step mode', () => {
    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    render(<MoveControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Precision' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_NUDGE_STEP' })
    expect(announce).toHaveBeenCalledWith('Precision off')
  })
})
