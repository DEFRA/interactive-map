import React, { forwardRef } from 'react'
import { render, fireEvent, act, cleanup } from '@testing-library/react'
import { Tooltip } from './Tooltip'
import { useApp } from '../../store/appContext'
import { getTooltipPosition } from './getTooltipPosition'

jest.mock('../../store/appContext')
jest.mock('./getTooltipPosition')
jest.useFakeTimers()

describe('Tooltip', () => {
  // Standard test button
  const Button = forwardRef((props, ref) => <button ref={ref} {...props}>Test button</button>)

  // Helper to render Tooltip and return elements
  const renderTooltip = (props = {}, interfaceType = 'mouse', Child = Button) => {
    useApp.mockReturnValue({ interfaceType })
    getTooltipPosition.mockReturnValue('bottom')

    const { container, unmount } = render(
      <Tooltip label='Test tooltip' {...props}>
        <Child />
      </Tooltip>
    )

    const wrapper = container.firstChild
    const button = wrapper.querySelector('button')
    const tooltip = wrapper.querySelector('[role="tooltip"]')
    return { wrapper, button, tooltip, unmount }
  }

  // Helper to advance timers
  const advanceTimers = (ms = 500) => act(() => jest.advanceTimersByTime(ms))

  beforeEach(() => jest.clearAllMocks())
  afterEach(cleanup)

  // --- Standard Tooltip tests ---
  it('names the trigger with the label', () => {
    const { button, tooltip } = renderTooltip()
    expect(tooltip).toHaveTextContent('Test tooltip')
    expect(button).toHaveAccessibleName('Test tooltip')
    expect(button).not.toHaveAttribute('aria-describedby')
  })

  it('describes the trigger with the description, without naming it', () => {
    const { button, tooltip } = renderTooltip({ label: undefined, description: 'More detail' })
    expect(tooltip).toHaveTextContent('More detail')
    expect(button).toHaveAccessibleName('Test button')
    expect(button).toHaveAccessibleDescription('More detail')
  })

  it('shows the label and description together, reading each only once', () => {
    const { button, tooltip } = renderTooltip({ description: 'More detail' })
    expect(tooltip).toHaveTextContent('Test tooltip: More detail')
    expect(button).toHaveAccessibleName('Test tooltip')
    expect(button).toHaveAccessibleDescription('More detail')
  })

  it('keeps the trigger\'s own handlers', () => {
    const handlers = {
      onMouseEnter: jest.fn(),
      onMouseLeave: jest.fn(),
      onMouseDown: jest.fn(),
      onKeyDown: jest.fn(),
      onFocus: jest.fn(),
      onBlur: jest.fn()
    }
    useApp.mockReturnValue({ interfaceType: 'keyboard' })
    const { container } = render(<Tooltip label='Test tooltip'><Button {...handlers} /></Tooltip>)
    const button = container.querySelector('button')
    fireEvent.mouseEnter(button)
    fireEvent.mouseLeave(button)
    fireEvent.mouseDown(button)
    fireEvent.keyDown(button, { key: 'ArrowDown' })
    fireEvent.focus(button)
    fireEvent.blur(button)
    Object.values(handlers).forEach(handler => expect(handler).toHaveBeenCalledTimes(1))
  })

  it('renders with correct initial state', () => {
    const { tooltip } = renderTooltip()
    expect(tooltip).toHaveClass('im-c-tooltip--hidden')
    expect(tooltip).not.toHaveClass('im-c-tooltip--is-visible')
    expect(tooltip).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows and hides tooltip on mouse interactions', () => {
    const { button, tooltip } = renderTooltip()
    fireEvent.mouseEnter(button)
    advanceTimers()
    expect(tooltip).toHaveClass('im-c-tooltip--is-visible')
    expect(getTooltipPosition).toHaveBeenCalled()
    fireEvent.mouseLeave(button)
    advanceTimers(0)
    expect(tooltip).not.toHaveClass('im-c-tooltip--is-visible')
  })

  it('cancels tooltip on mouse down or key down', () => {
    const { button, tooltip } = renderTooltip()
    fireEvent.mouseEnter(button)
    fireEvent.mouseDown(button)
    fireEvent.mouseEnter(button)
    fireEvent.keyDown(button)
    advanceTimers()
    expect(tooltip).not.toHaveClass('im-c-tooltip--is-visible')
  })

  it('handles focus interactions for keyboard interface', () => {
    const { button, tooltip, wrapper } = renderTooltip({}, 'keyboard')
    fireEvent.focus(button)
    advanceTimers()
    expect(wrapper).toHaveClass('im-c-tooltip-wrapper--has-focus')
    expect(tooltip).toHaveClass('im-c-tooltip--is-visible')
    fireEvent.blur(button)
    advanceTimers(0)
    expect(wrapper).not.toHaveClass('im-c-tooltip-wrapper--has-focus')
    expect(tooltip).not.toHaveClass('im-c-tooltip--is-visible')
  })

  it('does not show tooltip on focus if interfaceType is mouse', () => {
    const { button, tooltip } = renderTooltip()
    fireEvent.focus(button)
    advanceTimers()
    expect(tooltip).not.toHaveClass('im-c-tooltip--is-visible')
  })

  it('hides tooltip on Escape key', () => {
    const { button, tooltip } = renderTooltip()
    fireEvent.mouseEnter(button)
    advanceTimers()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(tooltip).not.toHaveClass('im-c-tooltip--is-visible')
  })

  it('removes keydown listener on unmount', () => {
    const { button, unmount } = renderTooltip({}, 'keyboard')
    fireEvent.mouseEnter(button)
    advanceTimers()
    const removeSpy = jest.spyOn(window, 'removeEventListener')
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })

  // --- Ref tests ---
  // Function ref
  const ChildWithFunctionRef = forwardRef((props, ref) => (
    <button ref={ref} {...props}>Function Ref</button>
  ))

  it('calls a function ref on child', () => {
    const fnRef = jest.fn()

    render(
      <Tooltip label='Test tooltip'>
        <ChildWithFunctionRef ref={fnRef} />
      </Tooltip>
    )

    advanceTimers()

    expect(fnRef).toHaveBeenCalled()
    expect(fnRef.mock.calls[0][0].tagName).toBe('BUTTON')
  })

  // Object ref
  const ChildWithObjectRef = forwardRef((props, ref) => (
    <button ref={ref} {...props}>Object Ref</button>
  ))

  it('assigns ref.current when child has object ref', () => {
    const objRef = { current: null }

    render(
      <Tooltip label='Test tooltip'>
        <ChildWithObjectRef ref={objRef} />
      </Tooltip>
    )

    advanceTimers()

    expect(objRef.current).not.toBeNull()
    expect(objRef.current.tagName).toBe('BUTTON')
  })
})
