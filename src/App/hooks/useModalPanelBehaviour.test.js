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

const MODAL_INSET = '--modal-inset'
const MODAL_MAX_HEIGHT = '--modal-max-height'
const PANEL_ID = 'modal-panel-id'
const ARIA_CONTROLS = 'aria-controls'

describe('useModalPanelBehaviour', () => {
  let refs, elements, handleClose

  beforeEach(() => {
    refs = {
      main: { current: document.createElement('div') },
      panel: { current: document.createElement('div') }
    }
    // Give panel an ID for aria-controls tests and a slot for setSlotCSSVar
    refs.panel.current.id = PANEL_ID
    refs.panel.current.dataset.slot = 'inset'

    elements = {
      buttonContainer: document.createElement('div'),
      root: document.createElement('div')
    }

    elements.root.appendChild(refs.panel.current)
    document.body.appendChild(elements.root)

    handleClose = jest.fn()
    jest.clearAllMocks()
    document.documentElement.style.setProperty(MODAL_INSET, '')
    document.documentElement.style.setProperty(MODAL_MAX_HEIGHT, '')
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
      jest.spyOn(globalThis, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => '8' })

      Object.defineProperty(refs.main.current, 'getBoundingClientRect', {
        value: () => ({ top: 0, right: 100, bottom: 50, left: 0, width: 100, height: 50 }),
        configurable: true
      })
      Object.defineProperty(elements.buttonContainer, 'getBoundingClientRect', {
        value: () => ({ top: 10, right: 80, bottom: 40, left: 20, width: 60, height: 30 }),
        configurable: true
      })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('sets --modal-inset via SLOT_MODAL_VARS for top slot', () => {
      refs.panel.current.dataset.slot = 'left-top'
      render(<TestComponent />)
      expect(document.documentElement.style.getPropertyValue(MODAL_INSET))
        .toBe('var(--left-offset-top) auto auto var(--primary-gap)')
      expect(document.documentElement.style.getPropertyValue(MODAL_MAX_HEIGHT))
        .toBe('var(--left-top-max-height)')
    })

    it('sets --modal-inset via SLOT_MODAL_VARS for bottom slot', () => {
      refs.panel.current.dataset.slot = 'left-bottom'
      render(<TestComponent />)
      expect(document.documentElement.style.getPropertyValue(MODAL_INSET))
        .toBe('auto auto var(--left-offset-bottom) var(--primary-gap)')
      expect(document.documentElement.style.getPropertyValue(MODAL_MAX_HEIGHT))
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

      expect(document.documentElement.style.getPropertyValue(MODAL_INSET)).toBe('60px auto auto 8px')
      expect(document.documentElement.style.getPropertyValue(MODAL_MAX_HEIGHT)).toContain('px')
    })

    it('leaves --modal-inset unset when slot ref cannot be resolved', () => {
      render(<TestComponent />)
      expect(document.documentElement.style.getPropertyValue(MODAL_INSET)).toBe('')
    })

    it('updates --modal-inset and --modal-max-height via aria-controls when buttonContainerEl is stale', () => {
      refs.panel.current.dataset.slot = buttonSlot

      const button = document.createElement('button')
      button.setAttribute(ARIA_CONTROLS, PANEL_ID)
      elements.buttonContainer.appendChild(button)
      document.body.appendChild(elements.buttonContainer)

      const staleEl = document.createElement('div') // detached
      render(<TestComponent buttonContainerEl={staleEl} />)

      expect(document.documentElement.style.getPropertyValue(MODAL_INSET)).toContain('10px')
      expect(document.documentElement.style.getPropertyValue(MODAL_MAX_HEIGHT)).toContain('px')
    })

    it('uses data-button-slot fallback when no aria-controls button and no buttonContainerEl', () => {
      refs.panel.current.dataset.slot = buttonSlot
      elements.buttonContainer.dataset.buttonSlot = buttonSlot
      document.body.appendChild(elements.buttonContainer)

      render(<TestComponent buttonContainerEl={undefined} />)

      expect(document.documentElement.style.getPropertyValue(MODAL_INSET)).toContain('10px')
      expect(document.documentElement.style.getPropertyValue(MODAL_MAX_HEIGHT)).toContain('px')
    })

    it('uses connected buttonContainerEl when panel has no ID', () => {
      refs.panel.current.id = '' // falsy panelElId → currentButtonEl = null (line 152 false branch)
      refs.panel.current.dataset.slot = buttonSlot
      document.body.appendChild(elements.buttonContainer) // isConnected = true (line 154 true branch)

      render(<TestComponent buttonContainerEl={elements.buttonContainer} />)

      expect(document.documentElement.style.getPropertyValue(MODAL_INSET)).toContain('10px')
    })

    it('skips update when effectiveContainer cannot be resolved', () => {
      refs.panel.current.dataset.slot = buttonSlot
      render(<TestComponent buttonContainerEl={null} />)
      expect(document.documentElement.style.getPropertyValue(MODAL_INSET)).toBe('')
    })

    it('anchors to bottom when button is in a bottom sub-slot', () => {
      refs.panel.current.dataset.slot = buttonSlot
      const button = document.createElement('button')
      button.setAttribute(ARIA_CONTROLS, PANEL_ID)
      elements.buttonContainer.appendChild(button)
      const bottomSlot = document.createElement('div')
      bottomSlot.className = 'im-o-app__right-bottom'
      bottomSlot.appendChild(elements.buttonContainer)
      document.body.appendChild(bottomSlot)

      render(<TestComponent />)

      // Bottom slot: insetTop='auto', insetBottom = mainRect.bottom - buttonRect.bottom = 50 - 40 = 10px
      expect(document.documentElement.style.getPropertyValue(MODAL_INSET)).toMatch(/^auto/)
      expect(document.documentElement.style.getPropertyValue(MODAL_INSET)).toContain('10px')
    })

    it('uses left inset when button is in a left sub-slot', () => {
      refs.panel.current.dataset.slot = buttonSlot
      const button = document.createElement('button')
      button.setAttribute(ARIA_CONTROLS, PANEL_ID)
      elements.buttonContainer.appendChild(button)
      const leftSlot = document.createElement('div')
      leftSlot.className = 'im-o-app__left-top'
      leftSlot.appendChild(elements.buttonContainer)
      document.body.appendChild(leftSlot)

      render(<TestComponent />)

      // Left slot: insetTop = buttonRect.top - mainRect.top = 10, insetLeft = buttonRect.right - mainRect.left + dividerGap = 80 + 8 = 88
      expect(document.documentElement.style.getPropertyValue(MODAL_INSET)).toBe('10px auto auto 88px')
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

    it('does not close when backdrop is outside rootEl', () => {
      const externalBackdrop = document.createElement('div')
      externalBackdrop.className = 'im-o-app__modal-backdrop'
      document.body.appendChild(externalBackdrop)

      render(<TestComponent />)
      fireEvent.click(externalBackdrop)
      expect(handleClose).not.toHaveBeenCalled()
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
