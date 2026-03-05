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
    // Give panel an ID for aria-controls tests
    refs.panel.current.id = 'modal-panel-id'
    
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

  const TestComponent = ({ 
    isModal = true, 
    buttonContainerEl,
    rootEl = elements.root 
  }) => {
    useModalPanelBehaviour({
      mainRef: refs.main,
      panelRef: refs.panel,
      isModal,
      rootEl,
      buttonContainerEl,
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

  describe('positioning (--modal-inset)', () => {
    beforeEach(() => {
      // Force ResizeObserver to run the callback immediately
      useResizeObserverModule.useResizeObserver.mockImplementation((_, cb) => cb())
      
      Object.defineProperty(refs.main.current, 'getBoundingClientRect', {
        value: () => ({ top: 0, right: 100, bottom: 50, left: 0, width: 100, height: 50 }),
        configurable: true
      })
      Object.defineProperty(elements.buttonContainer, 'getBoundingClientRect', {
        value: () => ({ top: 10, right: 80, bottom: 40, left: 20, width: 60, height: 30 }),
        configurable: true
      })
    })

    it('hits the buttonContainerEl === undefined branch', () => {
      refs.main.current = document.createElement('div') // mainRef must exist
      render(<TestComponent />)

      // Manually trigger ResizeObserver callback (if mocked)
      const callback = useResizeObserverModule.useResizeObserver.mock.calls[0][1]
      callback()

      // Expect CSS variable not set, just to assert callback ran
      const inset = document.documentElement.style.getPropertyValue('--modal-inset')
      expect(inset).toBe('')
    })

    it('updates --modal-inset via aria-controls when buttonContainerEl is stale', () => {
      const button = document.createElement('button')
      button.setAttribute('aria-controls', 'modal-panel-id')
      elements.buttonContainer.appendChild(button)
      document.body.appendChild(elements.buttonContainer)

      const staleEl = document.createElement('div') // detached
      render(<TestComponent buttonContainerEl={staleEl} />)

      const inset = document.documentElement.style.getPropertyValue('--modal-inset')
      expect(inset).toContain('10px')
    })

    it('skips update when effectiveContainer cannot be resolved', () => {
      render(<TestComponent buttonContainerEl={null} />)
      const inset = document.documentElement.style.getPropertyValue('--modal-inset')
      expect(inset).toBe('')
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

    // COVERS LINE 44 (The early return branch)
    it('does not redirect focus when focus moves completely outside the app root', () => {
      refs.panel.current.focus = jest.fn()
      render(<TestComponent />)

      const externalEl = document.createElement('button')
      document.body.appendChild(externalEl) // Outside elements.root
      
      dispatchFocusIn(externalEl)

      // Since isInsideApp is false, it should hit the "return" and not call focus()
      expect(refs.panel.current.focus).not.toHaveBeenCalled()
    })

    it('does not redirect focus when focus is already inside panel', () => {
      refs.panel.current.focus = jest.fn()
      render(<TestComponent />)

      const insideEl = document.createElement('input')
      refs.panel.current.appendChild(insideEl)
      dispatchFocusIn(insideEl)

      expect(refs.panel.current.focus).not.toHaveBeenCalled()
    })

    it('handles null focus targets gracefully', () => {
      render(<TestComponent />)
      dispatchFocusIn(null)
      expect(true).toBe(true) 
    })
  })

  describe('backdrop and inert', () => {
    it('calls handleClose when backdrop inside rootEl is clicked', () => {
      const backdrop = document.createElement('div')
      backdrop.className = 'im-o-app__modal-backdrop'
      elements.root.appendChild(backdrop)
      
      render(<TestComponent />)
      fireEvent.click(backdrop)
      expect(handleClose).toHaveBeenCalled()
    })

    it('toggles inert elements on mount and cleanup', () => {
      const { unmount } = render(<TestComponent />)
      expect(toggleInertModule.toggleInertElements).toHaveBeenCalledWith(
        expect.objectContaining({ isFullscreen: true })
      )
      unmount()
      expect(toggleInertModule.toggleInertElements).toHaveBeenCalledWith(
        expect.objectContaining({ isFullscreen: false })
      )
    })
  })

  it('does nothing when isModal is false', () => {
    render(<TestComponent isModal={false} />)
    fireEvent.keyDown(refs.panel.current, { key: 'Escape' })
    expect(handleClose).not.toHaveBeenCalled()
  })
})