import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoveControl } from './MoveControl.jsx'
import { useApp } from '../../store/appContext.js'
import { useConfig } from '../../store/configContext.js'
import { useService } from '../../store/serviceContext.js'

jest.mock('../../store/appContext.js', () => ({ useApp: jest.fn() }))
jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))
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
    nudgeStepSize: 'small',
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

  it('pans by the small delta and announces the action', () => {
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Pan up' }))
    expect(mapProvider.panBy).toHaveBeenCalledWith([0, -5])
    expect(announce).toHaveBeenCalledWith('Panned up')
  })

  it('pans by the large delta when nudgeStepSize is large', () => {
    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'large' }))
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Pan right' }))
    expect(mapProvider.panBy).toHaveBeenCalledWith([100, 0])
  })

  it('zooms in and out and announces the action', () => {
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(mapProvider.zoomIn).toHaveBeenCalledWith(0.1)
    expect(announce).toHaveBeenCalledWith('Zoomed in')

    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(mapProvider.zoomOut).toHaveBeenCalledWith(0.1)
    expect(announce).toHaveBeenCalledWith('Zoomed out')
  })

  it('toggles the step size and announces the new mode when going small to large', () => {
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Small step' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_NUDGE_STEP' })
    expect(announce).toHaveBeenCalledWith('Large step')
  })

  it('toggles the step size and announces the new mode when going large to small', () => {
    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'large' }))
    render(<MoveControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Large step' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_NUDGE_STEP' })
    expect(announce).toHaveBeenCalledWith('Small step')
  })

  it('shows "Large step" as the toggle label when nudgeStepSize is large', () => {
    useApp.mockReturnValue(buildAppState({ nudgeStepSize: 'large' }))
    render(<MoveControl />)
    expect(screen.getByRole('button', { name: 'Large step' })).toBeInTheDocument()
  })
})
