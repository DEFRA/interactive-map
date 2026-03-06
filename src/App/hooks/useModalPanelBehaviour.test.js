import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { useModalPanelBehaviour } from './useModalPanelBehaviour.js'
import * as useResizeObserverModule from './useResizeObserver.js'
import * as constrainFocusModule from '../../utils/constrainKeyboardFocus.js'
import * as toggleInertModule from '../../utils/toggleInertElements.js'
import { useApp } from '../store/appContext.js'

jest.mock('./useResizeObserver.js')
jest.mock('../../utils/constrainKeyboardFocus.js')
jest.mock('../../utils/toggleInertElements.js')
jest.mock('../store/appContext.js')

describe('useModalPanelBehaviour', () => {
  let refs, elements, handleClose

  beforeEach(() => {
    refs = {
      main: { current: document.createElement('div') },
      panel: { current: document.createElement('div') }
    }
    // Give panel an ID for aria-controls tests and a slot for setSlotCSSVar
    refs.panel.current.id = 'modal-panel-id'
    refs.panel.current.dataset.slot = 'inset'

    elements = {
      buttonContainer: document.createElement('div'),
      root: document.createElement('div')
    }

    elements.root.appendChild(refs.panel.current)
    document.body.appendChild(elements.root)

    handleClose = jest.fn()
    jest.clearAllMocks()
    document.documentElement.style.setProperty('--modal-inset', '')
    document.documentElement.style.setProperty('--modal-max-height', '')
    useApp.mockReturnValue({ layoutRefs: {} })
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

  describe('positioning (--modal-inset, --modal-max-height)', () => {
    const buttonSlot = 'map-styles-button'

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

    it('sets --modal-inset via SLOT_MODAL_VARS for left/right slots', () => {
      refs.panel.current.dataset.slot = 'left-top'
      render(<TestComponent />)
      expect(document.documentElement.style.getPropertyValue('--modal-inset'))
        .toBe('var(--left-offset-top) auto auto var(--primary-gap)')
      expect(document.documentElement.style.getPropertyValue('--modal-max-height'))
        .toBe('var(--left-top-max-height)')
    })

    it('sets --modal-inset and --modal-max-height from slot container when no buttonContainerEl', () => {
      const insetEl = document.createElement('div')
      Object.defineProperty(insetEl, 'getBoundingClientRect', {
        value: () => ({ top: 60, left: 8, right: 200, bottom: 200 }),
        configurable: true
      })
      Object.defineProperty(insetEl, 'offsetWidth', { value: 192, configurable: true })
      useApp.mockReturnValue({ layoutRefs: { insetRef: { current: insetEl }, mainRef: refs.main } })

      render(<TestComponent />)

      expect(document.documentElement.style.getPropertyValue('--modal-inset')).toBe('60px auto auto 8px')
      expect(document.documentElement.style.getPropertyValue('--modal-max-height')).toContain('px')
    })

    it('leaves --modal-inset unset when slot ref cannot be resolved', () => {
      render(<TestComponent />)
      expect(document.documentElement.style.getPropertyValue('--modal-inset')).toBe('')
    })

    it('updates --modal-inset and --modal-max-height via aria-controls when buttonContainerEl is stale', () => {
      refs.panel.current.dataset.slot = buttonSlot

      const button = document.createElement('button')
      button.setAttribute('aria-controls', 'modal-panel-id')
      elements.buttonContainer.appendChild(button)
      document.body.appendChild(elements.buttonContainer)

      const staleEl = document.createElement('div') // detached
      render(<TestComponent buttonContainerEl={staleEl} />)

      expect(document.documentElement.style.getPropertyValue('--modal-inset')).toContain('10px')
      expect(document.documentElement.style.getPropertyValue('--modal-max-height')).toContain('px')
    })

    it('uses data-button-slot fallback when no aria-controls button and no buttonContainerEl', () => {
      refs.panel.current.dataset.slot = buttonSlot
      elements.buttonContainer.dataset.buttonSlot = buttonSlot
      document.body.appendChild(elements.buttonContainer)

      render(<TestComponent buttonContainerEl={undefined} />)

      expect(document.documentElement.style.getPropertyValue('--modal-inset')).toContain('10px')
      expect(document.documentElement.style.getPropertyValue('--modal-max-height')).toContain('px')
    })

    it('skips update when effectiveContainer cannot be resolved', () => {
      refs.panel.current.dataset.slot = buttonSlot
      render(<TestComponent buttonContainerEl={null} />)
      expect(document.documentElement.style.getPropertyValue('--modal-inset')).toBe('')
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
