import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoveControl } from './MoveControl.jsx'
import { useApp } from '../../store/appContext.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'

jest.mock('../../store/appContext.js', () => ({ useApp: jest.fn() }))
jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/mapContext.js', () => ({ useMap: jest.fn() }))
jest.mock('../../store/serviceContext.js', () => ({ useService: jest.fn() }))

describe('MoveControl', () => {
  let dispatch
  let mapProvider
  let announce

  // MapButton and Tooltip also read from useApp() (buttonRefs, interfaceType), so every
  // mockReturnValue needs to carry these alongside the fields MoveControl itself reads.
  const buildAppState = (overrides) => ({
    buttonRefs: { current: {} },
    interfaceType: 'mouse',
    dispatch,
    expandedButtons: new Set(['moveControl']),
    nudgeStepSize: 'large',
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
    const { container } = render(<MoveControl />)
    expect(container.querySelector('#im-move-control')).toBeInTheDocument()
  })

  it('is not visually collapsed when moveControl is expanded', () => {
    const { container } = render(<MoveControl />)
    expect(container.querySelector('.im-c-move-control--collapsed')).not.toBeInTheDocument()
  })

  it('is collapsed when moveControl is not expanded', () => {
    useApp.mockReturnValue(buildAppState({ expandedButtons: new Set() }))
    const { container } = render(<MoveControl />)
    expect(container.querySelector('.im-c-move-control--collapsed')).toBeInTheDocument()
  })

  it('labels direction buttons "Move" and pans by the large delta by default', () => {
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }))
    expect(mapProvider.panBy).toHaveBeenCalledWith([100, 0])
    expect(announce).toHaveBeenCalledWith('Moved right')
  })

  it('labels direction buttons "Nudge" and pans by the small delta when nudgeStepSize is small', () => {
    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Nudge up' }))
    expect(mapProvider.panBy).toHaveBeenCalledWith([0, -5])
    expect(announce).toHaveBeenCalledWith('Nudged up')
  })

  it('zooms in and out by the large delta by default and announces the action', () => {
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(mapProvider.zoomIn).toHaveBeenCalledWith(1)
    expect(announce).toHaveBeenCalledWith('Zoomed in')

    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(mapProvider.zoomOut).toHaveBeenCalledWith(1)
    expect(announce).toHaveBeenCalledWith('Zoomed out')
  })

  it('zooms by the small delta when nudgeStepSize is small', () => {
    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(mapProvider.zoomIn).toHaveBeenCalledWith(0.1)
  })

  it('disables the zoom in button at max zoom, and zoom out at min zoom', () => {
    useMap.mockReturnValue({ isAtMaxZoom: true, isAtMinZoom: false })
    const { rerender } = render(<MoveControl />)
    expect(screen.getByRole('button', { name: 'Zoom in' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Zoom out' })).not.toHaveAttribute('aria-disabled')

    useMap.mockReturnValue({ isAtMaxZoom: false, isAtMinZoom: true })
    rerender(<MoveControl />)
    expect(screen.getByRole('button', { name: 'Zoom in' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('button', { name: 'Zoom out' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not zoom when the relevant button is disabled at max/min zoom', () => {
    useMap.mockReturnValue({ isAtMaxZoom: true, isAtMinZoom: true })
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(mapProvider.zoomIn).not.toHaveBeenCalled()
    expect(mapProvider.zoomOut).not.toHaveBeenCalled()
  })

  it('has a stable "Nudge mode" label regardless of state', () => {
    const { rerender } = render(<MoveControl />)
    expect(screen.getByRole('button', { name: 'Nudge mode' })).toBeInTheDocument()

    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    rerender(<MoveControl />)
    expect(screen.getByRole('button', { name: 'Nudge mode' })).toBeInTheDocument()
  })

  it('shows an aria-hidden (On)/(Off) suffix in the tooltip without affecting the accessible name', () => {
    // The (On)/(Off) suffix lives in the Tooltip's content div (a sibling of the
    // <button>, referenced via aria-labelledby), not inside the button itself. Several
    // tooltips exist in the DOM (one per icon-only button), so resolve this button's
    // own tooltip via its aria-labelledby id rather than grabbing the first one.
    const getOwnTooltip = () => {
      const button = screen.getByRole('button', { name: 'Nudge mode' })
      return document.getElementById(button.getAttribute('aria-labelledby'))
    }

    const { rerender } = render(<MoveControl />)
    let tooltip = getOwnTooltip()
    expect(tooltip.querySelector('[aria-hidden="true"]')).toHaveTextContent('(Off)')
    expect(tooltip).toHaveTextContent('Nudge mode (Off)')

    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    rerender(<MoveControl />)
    tooltip = getOwnTooltip()
    expect(tooltip.querySelector('[aria-hidden="true"]')).toHaveTextContent('(On)')
    expect(tooltip).toHaveTextContent('Nudge mode (On)')
  })

  it('reflects nudge mode via aria-pressed, not via label changes', () => {
    const { rerender } = render(<MoveControl />)
    expect(screen.getByRole('button', { name: 'Nudge mode' })).toHaveAttribute('aria-pressed', 'false')

    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    rerender(<MoveControl />)
    expect(screen.getByRole('button', { name: 'Nudge mode' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles nudge mode on and announces it when currently in large-step mode', () => {
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Nudge mode' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_NUDGE_STEP' })
    expect(announce).toHaveBeenCalledWith('Nudge mode on')
  })

  it('toggles nudge mode off and announces it when currently in small-step mode', () => {
    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'small' }))
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Nudge mode' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_NUDGE_STEP' })
    expect(announce).toHaveBeenCalledWith('Nudge mode off')
  })
})
