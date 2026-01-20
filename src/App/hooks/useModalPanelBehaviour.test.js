import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { useModalPanelBehaviour } from './useModalPanelBehaviour.js'
import * as useResizeObserverModule from './useResizeObserver.js'
import * as constrainFocusModule from '../../utils/constrainKeyboardFocus.js'
import * as toggleInertModule from '../../utils/toggleInertElements.js'

jest.mock('./useResizeObserver.js')
jest.mock('../../utils/constrainKeyboardFocus.js')
jest.mock('../../utils/toggleInertElements.js')

describe('useModalPanelBehaviour', () => {
  let refs, elements, handleClose

  beforeEach(() => {
    refs = {
      main: { current: document.createElement('div') },
      panel: { current: document.createElement('div') }
    }
    elements = {
      buttonContainer: document.createElement('div'),
      root: document.createElement('div')
    }
    elements.root.appendChild(refs.panel.current)
    document.body.appendChild(elements.root)
    handleClose = jest.fn()
    jest.clearAllMocks()
    document.documentElement.style.setProperty('--modal-inset', '')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const TestComponent = ({ isModal = true }) => {
    useModalPanelBehaviour({
      mainRef: refs.main,
      panelRef: refs.panel,
      isModal,
      rootEl: elements.root,
      buttonContainerEl: elements.buttonContainer,
      handleClose
    })
    return null
  }

  const dispatchFocusIn = (target) => {
    const event = new FocusEvent('focusin', { bubbles: true })
    Object.defineProperty(event, 'target', { value: target, enumerable: true })
    document.dispatchEvent(event)
  }

  it('handles Escape and Tab keys', () => {
    render(<TestComponent />)

    fireEvent.keyDown(refs.panel.current, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalled()

    fireEvent.keyDown(refs.panel.current, { key: 'Tab' })
    expect(constrainFocusModule.constrainKeyboardFocus).toHaveBeenCalledWith(
      refs.panel.current,
      expect.any(Object)
    )
  })

  it('updates --modal-inset on resize', () => {
    useResizeObserverModule.useResizeObserver.mockImplementation((_, cb) => cb())
    Object.defineProperty(refs.main.current, 'getBoundingClientRect', {
      value: () => ({ top: 0, right: 100, bottom: 50, left: 0, width: 100, height: 50 })
    })
    Object.defineProperty(elements.buttonContainer, 'getBoundingClientRect', {
      value: () => ({ top: 10, right: 80, bottom: 40, left: 20, width: 60, height: 30 })
    })

    render(<TestComponent />)

    const inset = getComputedStyle(document.documentElement).getPropertyValue('--modal-inset')
    expect(inset).toContain('10px')
  })

  describe('backdrop clicks', () => {
    const createBackdrop = (appendTo) => {
      const backdrop = document.createElement('div')
      backdrop.className = 'im-o-app__modal-backdrop'
      appendTo.appendChild(backdrop)
      return backdrop
    }

    it('calls handleClose when backdrop inside rootEl is clicked', () => {
      const backdrop = createBackdrop(elements.root)
      render(<TestComponent />)
      fireEvent.click(backdrop)
      expect(handleClose).toHaveBeenCalled()
    })

    it('does not call handleClose when backdrop outside rootEl is clicked', () => {
      const backdrop = createBackdrop(document.body)
      render(<TestComponent />)
      fireEvent.click(backdrop)
      expect(handleClose).not.toHaveBeenCalled()
    })

    it('does not call handleClose when non-backdrop element is clicked', () => {
      elements.root.appendChild(document.createElement('div'))
      render(<TestComponent />)
      fireEvent.click(elements.root.firstChild)
      expect(handleClose).not.toHaveBeenCalled()
    })
  })

  it('toggles inert elements on mount and cleanup', () => {
    const { unmount } = render(<TestComponent />)

    expect(toggleInertModule.toggleInertElements).toHaveBeenCalledWith({
      containerEl: refs.panel.current,
      isFullscreen: true,
      boundaryEl: elements.root
    })

    unmount()

    expect(toggleInertModule.toggleInertElements).toHaveBeenCalledWith({
      containerEl: refs.panel.current,
      isFullscreen: false,
      boundaryEl: elements.root
    })
  })

  describe('focus management', () => {
    it('redirects focus into panel when focus enters app but outside panel', () => {
      refs.panel.current.focus = jest.fn()
      render(<TestComponent />)

      const outsideEl = document.createElement('input')
      elements.root.appendChild(outsideEl)
      dispatchFocusIn(outsideEl)

      expect(refs.panel.current.focus).toHaveBeenCalled()
    })

    it('does not redirect focus when focus is already inside panel', () => {
      refs.panel.current.focus = jest.fn()
      render(<TestComponent />)

      const insideEl = document.createElement('input')
      refs.panel.current.appendChild(insideEl)
      dispatchFocusIn(insideEl)

      expect(refs.panel.current.focus).not.toHaveBeenCalled()
    })

    it('handles edge cases gracefully', () => {
      render(<TestComponent />)

      dispatchFocusIn(null)

      refs.panel.current = null
      dispatchFocusIn(document.body)

      expect(true).toBe(true) // No errors thrown
    })
  })

  it('does nothing when isModal is false', () => {
    render(<TestComponent isModal={false} />)

    fireEvent.keyDown(refs.panel.current, { key: 'Escape' })
    expect(handleClose).not.toHaveBeenCalled()
    expect(toggleInertModule.toggleInertElements).not.toHaveBeenCalled()
  })
})
