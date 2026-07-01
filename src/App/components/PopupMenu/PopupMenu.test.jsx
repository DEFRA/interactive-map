import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PopupMenu } from './PopupMenu'

// Mock Icon
jest.mock('../Icon/Icon', () => ({
  Icon: ({ id, svgContent }) => <svg data-testid={id || 'custom-icon'} data-svg={svgContent} />
}))

// Mock useEvaluateProp
const mockEvaluateProp = jest.fn((fn) => fn({ /* mock context */ }))
jest.mock('../../hooks/useEvaluateProp.js', () => ({
  useEvaluateProp: () => mockEvaluateProp
}))

// Mock useConfig to provide `id` used for stable item ids
jest.mock('../../store/configContext', () => ({ useConfig: () => ({ id: 'app' }) }))

// Mock useApp
const mockUseApp = {
  buttonRefs: { current: { instigator: { focus: jest.fn(), contains: () => false } } },
  buttonConfig: {},
  hiddenButtons: new Set(),
  disabledButtons: new Set(),
  pressedButtons: new Set(),
  dispatch: jest.fn(),
  layoutRefs: {
    appContainerRef: { current: document.body },
    viewportRef: { current: { focus: jest.fn() } }
  }
}
jest.mock('../../store/appContext', () => ({
  useApp: jest.fn(() => mockUseApp)
}))

describe('PopupMenu', () => {
  const items = [
    { id: 'item1', label: 'Item 1', onClick: jest.fn() },
    { id: 'item2', label: 'Item 2', onClick: jest.fn(), iconId: 'icon2', pressedWhen: () => true }
  ]
  let menuRef
  const mockSetIsOpen = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    menuRef = { current: { focus: jest.fn(), contains: () => false } }

    // Reset mockUseApp state
    mockUseApp.buttonRefs.current = { instigator: { focus: jest.fn(), contains: () => false } }
    mockUseApp.buttonConfig = {}
    mockUseApp.hiddenButtons = new Set()
    mockUseApp.disabledButtons = new Set()
    mockUseApp.pressedButtons = new Set()
  })

  const renderMenu = (props = {}) =>
    render(
      <PopupMenu
        id='menu'
        pluginId='plugin1'
        instigatorId='instigator'
        startIndex={0}
        menuRef={menuRef}
        items={items}
        setIsOpen={mockSetIsOpen}
        {...props}
      />
    )

  // Test helpers to reduce duplication
  const setHidden = (ids = []) => {
    mockUseApp.hiddenButtons = new Set(ids)
  }
  const setPressed = (ids = []) => {
    mockUseApp.pressedButtons = new Set(ids)
  }
  const renderDirect = (opts = {}) => {
    const directMenuRef = { current: { focus: jest.fn(), contains: () => false } }
    render(
      <PopupMenu
        id='direct'
        pluginId='plugin1'
        instigatorId='instigator'
        menuRef={directMenuRef}
        items={items}
        setIsOpen={mockSetIsOpen}
        {...opts}
      />
    )
    return directMenuRef
  }
  const dispatchFocusIn = ({ menuContains = false, instigatorContains = false, target = document.body } = {}) => {
    jest.spyOn(menuRef.current, 'contains').mockReturnValue(menuContains)
    jest.spyOn(mockUseApp.buttonRefs.current.instigator, 'contains').mockReturnValue(instigatorContains)
    const ev = new FocusEvent('focusin')
    Object.defineProperty(ev, 'target', { value: target, enumerable: true })
    document.dispatchEvent(ev)
  }
  const expectSelected = (text) => expect(screen.getByText(text).parentElement).toHaveClass('im-c-popup-menu__item--selected')
  const expectNotSelected = (text) => expect(screen.getByText(text).parentElement).not.toHaveClass('im-c-popup-menu__item--selected')

  it('renders items with labels and icons', () => {
    renderMenu()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByTestId('icon2')).toBeInTheDocument()
  })

  it('applies selected class to active index', () => {
    renderMenu({ startIndex: 1 })
    expect(screen.getByText('Item 2').parentElement).toHaveClass(
      'im-c-popup-menu__item--selected'
    )
  })

  it('handles ArrowDown, ArrowUp, Home, End keys', () => {
    renderMenu()
    const ul = screen.getByRole('menu')
    fireEvent.keyDown(ul, { key: 'ArrowDown' })
    expect(screen.getByText('Item 2').parentElement).toHaveClass('im-c-popup-menu__item--selected')
    fireEvent.keyDown(ul, { key: 'ArrowDown' })
    expect(screen.getByText('Item 1').parentElement).toHaveClass('im-c-popup-menu__item--selected')
    fireEvent.keyDown(ul, { key: 'ArrowUp' })
    expect(screen.getByText('Item 2').parentElement).toHaveClass('im-c-popup-menu__item--selected')
    fireEvent.keyDown(ul, { key: 'Home' })
    expect(screen.getByText('Item 1').parentElement).toHaveClass('im-c-popup-menu__item--selected')
    fireEvent.keyDown(ul, { key: 'End' })
    expect(screen.getByText('Item 2').parentElement).toHaveClass('im-c-popup-menu__item--selected')
  })

  it('handles Enter key to call onClick and close menu', () => {
    renderMenu({ startIndex: 1 })
    const ul = screen.getByRole('menu')
    fireEvent.keyDown(ul, { key: 'Enter' })
    expect(items[1].onClick).toHaveBeenCalled()
    expect(mockSetIsOpen).toHaveBeenCalled()
  })

  it('handles Escape and Tab to close menu', () => {
    renderMenu()
    const ul = screen.getByRole('menu')
    fireEvent.keyDown(ul, { key: 'Escape' })
    expect(mockSetIsOpen).toHaveBeenCalled()
    fireEvent.keyDown(ul, { key: 'Tab' })
    expect(mockSetIsOpen).toHaveBeenCalled()
  })

  describe('Tab key focus handoff', () => {
    let before, instigatorEl, after1, after2

    beforeEach(() => {
      before = document.createElement('button')
      instigatorEl = document.createElement('button')
      after1 = document.createElement('button')
      after2 = document.createElement('button')
      document.body.append(before, instigatorEl, after1, after2)
      // jsdom never computes layout, so offsetParent is always null — findTabStop
      // treats that as "hidden" and skips it, so it must be stubbed for these to look focusable.
      ;[before, instigatorEl, after1, after2].forEach(el => Object.defineProperty(el, 'offsetParent', { value: true, configurable: true }))
      mockUseApp.buttonRefs.current.instigator = instigatorEl
    })

    afterEach(() => {
      [before, instigatorEl, after1, after2].forEach(el => el.remove())
    })

    it('moves focus to the tab stop after the instigator, not the first tab stop on the page', () => {
      renderMenu()
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' })
      expect(document.activeElement).toBe(after1)
    })

    it('Shift+Tab moves focus to the tab stop before the instigator', () => {
      renderMenu()
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(before)
    })

    it('falls back to computing the tab stop from the menu itself when the instigator is no longer available', () => {
      mockUseApp.buttonRefs.current.instigator = null
      renderMenu()
      expect(() => fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' })).not.toThrow()
      expect(document.activeElement).toBe(before)
      expect(mockUseApp.layoutRefs.viewportRef.current.focus).not.toHaveBeenCalled()
    })
  })

  describe('Tab key inside a modal dialog', () => {
    let dialogEl, insideBefore, instigatorEl, outsideAfter

    beforeEach(() => {
      dialogEl = document.createElement('div')
      dialogEl.setAttribute('role', 'dialog')
      dialogEl.setAttribute('aria-modal', 'true')
      insideBefore = document.createElement('button')
      instigatorEl = document.createElement('button')
      dialogEl.append(insideBefore, instigatorEl)
      outsideAfter = document.createElement('button')
      document.body.append(dialogEl, outsideAfter)
      ;[insideBefore, instigatorEl, outsideAfter].forEach(el => Object.defineProperty(el, 'offsetParent', { value: true, configurable: true }))
      mockUseApp.buttonRefs.current.instigator = instigatorEl
    })

    afterEach(() => {
      dialogEl.remove()
      outsideAfter.remove()
    })

    it('wraps within the dialog instead of escaping to a tab stop outside it', () => {
      renderMenu()
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' })
      expect(document.activeElement).toBe(insideBefore)
      expect(document.activeElement).not.toBe(outsideAfter)
    })
  })

  it('calls item onClick directly if no buttonConfig', () => {
    renderMenu()
    fireEvent.click(screen.getByText('Item 1'))
    expect(items[0].onClick).toHaveBeenCalled()
    expect(mockSetIsOpen).toHaveBeenCalled()
  })

  it('click on item with panelId dispatches OPEN_PANEL and closes menu', () => {
    mockUseApp.buttonConfig = { item1: { panelId: 'myPanel' } }
    renderMenu()
    fireEvent.click(screen.getByText('Item 1'))
    expect(mockUseApp.dispatch).toHaveBeenCalledWith({
      type: 'OPEN_PANEL',
      payload: { panelId: 'myPanel', props: { triggeringElement: mockUseApp.buttonRefs.current.instigator } }
    })
    expect(mockSetIsOpen).toHaveBeenCalledWith(false)
  })

  it('click on item with panelId and keepFocus includes focusOnOpen: false in dispatch', () => {
    mockUseApp.buttonConfig = { item1: { panelId: 'myPanel', keepFocus: true } }
    renderMenu()
    fireEvent.click(screen.getByText('Item 1'))
    expect(mockUseApp.dispatch).toHaveBeenCalledWith({
      type: 'OPEN_PANEL',
      payload: { panelId: 'myPanel', props: { triggeringElement: mockUseApp.buttonRefs.current.instigator }, focusOnOpen: false }
    })
  })

  it('click on item with keepFocus returns focus to instigator instead of viewport', () => {
    const focusSpy = jest.fn()
    mockUseApp.buttonRefs.current.instigator.focus = focusSpy
    mockUseApp.buttonConfig = { item1: { keepFocus: true } }
    renderMenu()
    fireEvent.click(screen.getByText('Item 1'))
    expect(focusSpy).toHaveBeenCalled()
  })

  it('calls buttonConfig.onClick with evaluateProp if defined', () => {
    const mockOnClick = jest.fn()
    mockUseApp.buttonConfig = { item2: { onClick: mockOnClick } }

    renderMenu()
    fireEvent.click(screen.getByText('Item 2'))

    expect(mockOnClick).toHaveBeenCalled()
    expect(mockEvaluateProp).toHaveBeenCalled()
    expect(mockSetIsOpen).toHaveBeenCalled()
  })

  it('does not call onClick or close menu when clicking a disabled item', () => {
    mockUseApp.disabledButtons = new Set(['item1'])
    renderMenu()
    fireEvent.click(screen.getByText('Item 1'))
    expect(items[0].onClick).not.toHaveBeenCalled()
    expect(mockSetIsOpen).not.toHaveBeenCalled()
  })

  it('Enter calls buttonConfig.onClick with evaluateProp context', () => {
    const mockOnClick = jest.fn()
    mockUseApp.buttonConfig = { item1: { onClick: mockOnClick } }
    renderMenu({ startIndex: 0 })
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    expect(mockOnClick).toHaveBeenCalled()
    expect(mockEvaluateProp).toHaveBeenCalled()
    expect(mockSetIsOpen).toHaveBeenCalled()
  })

  it('Enter on a disabled item closes menu but does not call onClick', () => {
    mockUseApp.disabledButtons = new Set(['item1'])
    renderMenu({ startIndex: 0 })
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    expect(items[0].onClick).not.toHaveBeenCalled()
    expect(mockSetIsOpen).toHaveBeenCalled()
  })

  it('Enter on item with panelId dispatches OPEN_PANEL and closes menu', () => {
    mockUseApp.buttonConfig = { item1: { panelId: 'myPanel' } }
    renderMenu({ startIndex: 0 })
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    expect(mockUseApp.dispatch).toHaveBeenCalledWith({
      type: 'OPEN_PANEL',
      payload: { panelId: 'myPanel', props: { triggeringElement: mockUseApp.buttonRefs.current.instigator } }
    })
    expect(mockSetIsOpen).toHaveBeenCalledWith(false)
  })

  it('Enter on item with panelId and keepFocus includes focusOnOpen: false in dispatch', () => {
    mockUseApp.buttonConfig = { item1: { panelId: 'myPanel', keepFocus: true } }
    renderMenu({ startIndex: 0 })
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    expect(mockUseApp.dispatch).toHaveBeenCalledWith({
      type: 'OPEN_PANEL',
      payload: { panelId: 'myPanel', props: { triggeringElement: mockUseApp.buttonRefs.current.instigator }, focusOnOpen: false }
    })
  })

  it('Enter on item with keepFocus returns focus to instigator instead of viewport', () => {
    const focusSpy = jest.fn()
    mockUseApp.buttonRefs.current.instigator.focus = focusSpy
    mockUseApp.buttonConfig = { item1: { keepFocus: true } }
    renderMenu({ startIndex: 0 })
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    expect(focusSpy).toHaveBeenCalled()
    expect(mockSetIsOpen).toHaveBeenCalledWith(false)
  })

  it('Enter on regular item focuses viewport via requestAnimationFrame', () => {
    const rafSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(cb => { cb(); return 1 })
    const focusSpy = jest.spyOn(mockUseApp.layoutRefs.viewportRef.current, 'focus')
    renderMenu({ startIndex: 0 })
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    expect(focusSpy).toHaveBeenCalled()
    rafSpy.mockRestore()
    focusSpy.mockRestore()
  })

  it('does nothing if click is inside menu', () => {
    renderMenu()
    const element = document.createElement('div')
    dispatchFocusIn({ menuContains: true, target: element })
    expect(mockSetIsOpen).not.toHaveBeenCalled()
  })

  it('does nothing if click is inside instigator', () => {
    renderMenu()
    dispatchFocusIn({ menuContains: false, instigatorContains: true, target: document.createElement('div') })
    expect(mockSetIsOpen).not.toHaveBeenCalled()
  })

  it('returns early if click/focus target is inside menu or instigator', () => {
    // menuRef contains → early return
    renderMenu()
    dispatchFocusIn({ menuContains: true, target: document.createElement('div') })
    expect(mockSetIsOpen).not.toHaveBeenCalled()

    // instigator contains → early return
    jest.clearAllMocks()
    jest.restoreAllMocks()
    jest.spyOn(mockUseApp.buttonRefs.current.instigator, 'contains').mockReturnValue(true)
    renderMenu()
    dispatchFocusIn({ menuContains: false, instigatorContains: true, target: document.createElement('div') })
    expect(mockSetIsOpen).not.toHaveBeenCalled()
  })

  it('evaluates line 51 but continues if target is outside', () => {
    renderMenu()
    dispatchFocusIn({ menuContains: false, instigatorContains: false, target: document.body })
    expect(mockSetIsOpen).toHaveBeenCalled()
  })

  it('closes when clicking outside', () => {
    renderMenu()
    document.dispatchEvent(new MouseEvent('pointerdown', { target: document.body }))
    expect(mockSetIsOpen).toHaveBeenCalled()
  })

  it('startPos="first" skips hidden items when selecting initial item', () => {
    setHidden(['item1'])
    renderMenu({ startPos: 'first', startIndex: undefined })
    expectSelected('Item 2')
  })

  it('startPos="last" skips hidden items when selecting initial item', () => {
    setHidden(['item2'])
    renderMenu({ startPos: 'last', startIndex: undefined })
    expectSelected('Item 1')
  })

  it('ArrowDown/ArrowUp from no selection picks first/last visible', () => {
    renderMenu({ startIndex: -1 })
    const ul = screen.getByRole('menu')
    fireEvent.keyDown(ul, { key: 'ArrowDown' })
    expect(screen.getByText('Item 1').parentElement).toHaveClass('im-c-popup-menu__item--selected')
    fireEvent.keyDown(ul, { key: 'ArrowUp' })
    expect(screen.getByText('Item 2').parentElement).toHaveClass('im-c-popup-menu__item--selected')
  })

  it('ArrowUp from no selection picks last visible', () => {
    renderMenu({ startIndex: -1 })
    const ul = screen.getByRole('menu')
    fireEvent.keyDown(ul, { key: 'ArrowUp' })
    expect(screen.getByText('Item 2').parentElement).toHaveClass('im-c-popup-menu__item--selected')
  })

  it('initializes with no selection when neither startIndex nor startPos provided', () => {
    renderMenu({ startIndex: undefined, startPos: undefined })
    expect(screen.getByText('Item 1').parentElement).not.toHaveClass('im-c-popup-menu__item--selected')
    expect(screen.getByText('Item 2').parentElement).not.toHaveClass('im-c-popup-menu__item--selected')
  })

  it('does nothing when navigating and no visible items', () => {
    mockUseApp.hiddenButtons = new Set(['item1', 'item2'])
    renderMenu({ startIndex: -1 })
    const ul = screen.getByRole('menu')
    fireEvent.keyDown(ul, { key: 'ArrowDown' })
    expect(screen.getByText('Item 1').parentElement).not.toHaveClass('im-c-popup-menu__item--selected')
    expect(screen.getByText('Item 2').parentElement).not.toHaveClass('im-c-popup-menu__item--selected')
  })

  it('Enter with no selection closes but does not call any item onClick', () => {
    renderMenu({ startIndex: -1 })
    const ul = screen.getByRole('menu')
    fireEvent.keyDown(ul, { key: 'Enter' })
    expect(items[0].onClick).not.toHaveBeenCalled()
    expect(items[1].onClick).not.toHaveBeenCalled()
    expect(mockSetIsOpen).toHaveBeenCalled()
  })

  it('Escape calls focus on instigator', () => {
    const focusSpy = jest.fn()
    mockUseApp.buttonRefs.current.instigator.focus = focusSpy
    renderMenu()
    const ul = screen.getByRole('menu')
    fireEvent.keyDown(ul, { key: 'Escape' })
    expect(focusSpy).toHaveBeenCalled()
  })

  it('Escape falls back to focusing viewport when instigator is no longer available', () => {
    mockUseApp.buttonRefs.current.instigator = null
    const focusSpy = jest.spyOn(mockUseApp.layoutRefs.viewportRef.current, 'focus')
    renderMenu()
    const ul = screen.getByRole('menu')
    expect(() => fireEvent.keyDown(ul, { key: 'Escape' })).not.toThrow()
    expect(focusSpy).toHaveBeenCalled()
    focusSpy.mockRestore()
  })

  it('direct render without startIndex respects startPos="first" (covers initializer and effect)', () => {
    renderDirect({ startPos: 'first' })
    expectSelected('Item 1')
  })

  it('direct render without startIndex respects startPos="last" (covers initializer and effect)', () => {
    renderDirect({ startPos: 'last' })
    expectSelected('Item 2')
  })

  it('startPos first with no visible items falls back to no selection', () => {
    setHidden(['item1', 'item2'])
    renderDirect({ startPos: 'first' })
    expectNotSelected('Item 1')
    expectNotSelected('Item 2')
  })

  it('startPos last with no visible items falls back to no selection', () => {
    setHidden(['item1', 'item2'])
    renderDirect({ startPos: 'last' })
    expectNotSelected('Item 1')
    expectNotSelected('Item 2')
  })

  it('sets aria-pressed and hides items based on pressedWhen and hiddenButtons', () => {
    setPressed(['item2'])
    setHidden(['item1'])
    renderMenu()
    const item1 = screen.getByText('Item 1').parentElement
    const item2 = screen.getByText('Item 2').parentElement
    expect(item1).toHaveStyle('display: none')
    expect(item2).toHaveAttribute('aria-checked', 'true')
  })

  it('ignores unrelated keys (covers Enter false branch)', () => {
    renderMenu({ startIndex: 1 })
    const ul = screen.getByRole('menu')
    fireEvent.keyDown(ul, { key: 'a' })
    expect(items[1].onClick).not.toHaveBeenCalled()
    expect(mockSetIsOpen).not.toHaveBeenCalled()
  })

  it('activateItem does nothing when item has no onClick and no buttonConfig.onClick (line 123 false branch)', () => {
    const noHandlerItems = [{ id: 'noHandler', label: 'No Handler' }]
    render(
      <PopupMenu
        pluginId='plugin1'
        instigatorId='instigator'
        startIndex={0}
        menuRef={menuRef}
        items={noHandlerItems}
        setIsOpen={mockSetIsOpen}
      />
    )
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    expect(mockSetIsOpen).toHaveBeenCalledWith(false)
  })

  it('activateItem skips synthetic click when element is not found in DOM (line 132 false branch)', () => {
    const getByIdSpy = jest.spyOn(document, 'getElementById').mockReturnValue(null)
    renderMenu({ startIndex: 0 })
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    getByIdSpy.mockRestore()
  })

  describe('Space key', () => {
    it('Space on a menuitem calls onClick and closes menu', () => {
      renderMenu({ startIndex: 0 })
      const ul = screen.getByRole('menu')
      fireEvent.keyDown(ul, { key: ' ' })
      expect(items[0].onClick).toHaveBeenCalled()
      expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    })

    it('Space on a menuitemcheckbox calls onClick but does not close menu', () => {
      renderMenu({ startIndex: 1 })
      const ul = screen.getByRole('menu')
      fireEvent.keyDown(ul, { key: ' ' })
      expect(items[1].onClick).toHaveBeenCalled()
      expect(mockSetIsOpen).not.toHaveBeenCalled()
    })

    it('Space on a disabled item does nothing', () => {
      mockUseApp.disabledButtons = new Set(['item1'])
      renderMenu({ startIndex: 0 })
      const ul = screen.getByRole('menu')
      fireEvent.keyDown(ul, { key: ' ' })
      expect(items[0].onClick).not.toHaveBeenCalled()
      expect(mockSetIsOpen).not.toHaveBeenCalled()
    })

    it('Space with no selection does nothing', () => {
      renderMenu({ startIndex: -1 })
      const ul = screen.getByRole('menu')
      fireEvent.keyDown(ul, { key: ' ' })
      expect(items[0].onClick).not.toHaveBeenCalled()
      expect(items[1].onClick).not.toHaveBeenCalled()
      expect(mockSetIsOpen).not.toHaveBeenCalled()
    })

    it('Space on item with panelId dispatches OPEN_PANEL and closes menu', () => {
      mockUseApp.buttonConfig = { item1: { panelId: 'myPanel' } }
      renderMenu({ startIndex: 0 })
      fireEvent.keyDown(screen.getByRole('menu'), { key: ' ' })
      expect(mockUseApp.dispatch).toHaveBeenCalledWith({
        type: 'OPEN_PANEL',
        payload: { panelId: 'myPanel', props: { triggeringElement: mockUseApp.buttonRefs.current.instigator } }
      })
      expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    })

    it('Space on item with panelId and keepFocus includes focusOnOpen: false in dispatch', () => {
      mockUseApp.buttonConfig = { item1: { panelId: 'myPanel', keepFocus: true } }
      renderMenu({ startIndex: 0 })
      fireEvent.keyDown(screen.getByRole('menu'), { key: ' ' })
      expect(mockUseApp.dispatch).toHaveBeenCalledWith({
        type: 'OPEN_PANEL',
        payload: { panelId: 'myPanel', props: { triggeringElement: mockUseApp.buttonRefs.current.instigator }, focusOnOpen: false }
      })
    })

    it('Space on item with keepFocus returns focus to instigator instead of viewport', () => {
      const focusSpy = jest.fn()
      mockUseApp.buttonRefs.current.instigator.focus = focusSpy
      mockUseApp.buttonConfig = { item1: { keepFocus: true } }
      renderMenu({ startIndex: 0 })
      fireEvent.keyDown(screen.getByRole('menu'), { key: ' ' })
      expect(focusSpy).toHaveBeenCalled()
      expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    })

    it('Space on regular item focuses viewport via requestAnimationFrame', () => {
      const rafSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(cb => { cb(); return 1 })
      const focusSpy = jest.spyOn(mockUseApp.layoutRefs.viewportRef.current, 'focus')
      renderMenu({ startIndex: 0 })
      fireEvent.keyDown(screen.getByRole('menu'), { key: ' ' })
      expect(focusSpy).toHaveBeenCalled()
      rafSpy.mockRestore()
      focusSpy.mockRestore()
    })
  })

  describe('buttonRect positioning', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true })
    })

    it('uses top and data-direction=below when button is in top half', () => {
      renderMenu({ buttonRect: { top: 100, bottom: 140, left: 50, right: 100 } })
      const menu = screen.getByRole('menu')
      expect(menu).toHaveStyle({ top: '140px' })
      expect(menu).toHaveAttribute('data-direction', 'below')
    })

    it('uses bottom and data-direction=above when button is in bottom half', () => {
      renderMenu({ buttonRect: { top: 500, bottom: 540, left: 50, right: 100 } })
      const menu = screen.getByRole('menu')
      expect(menu).toHaveStyle({ bottom: '268px' }) // 768 - 500
      expect(menu).toHaveAttribute('data-direction', 'above')
    })

    it('uses left and data-halign=left when button center is in left third', () => {
      // centerX = (50+100)/2 = 75 < 1024/3 ≈ 341
      renderMenu({ buttonRect: { top: 100, bottom: 140, left: 50, right: 100 } })
      const menu = screen.getByRole('menu')
      expect(menu).toHaveStyle({ left: '50px' })
      expect(menu).toHaveAttribute('data-halign', 'left')
    })

    it('uses right and data-halign=right when button center is in right third', () => {
      // centerX = (700+750)/2 = 725 > 1024*2/3 ≈ 683
      renderMenu({ buttonRect: { top: 100, bottom: 140, left: 700, right: 750 } })
      const menu = screen.getByRole('menu')
      expect(menu).toHaveStyle({ right: '274px' }) // 1024 - 750
      expect(menu).toHaveAttribute('data-halign', 'right')
    })

    it('uses button centerX and data-halign=center when button center is in middle third', () => {
      // centerX = (400+450)/2 = 425, between 341 and 683
      renderMenu({ buttonRect: { top: 100, bottom: 140, left: 400, right: 450 } })
      const menu = screen.getByRole('menu')
      expect(menu).toHaveStyle({ left: '425px' })
      expect(menu).toHaveAttribute('data-halign', 'center')
    })

    it('applies no inline style when buttonRect is not provided', () => {
      renderMenu()
      const style = screen.getByRole('menu').style
      expect(style.top).toBe('')
      expect(style.bottom).toBe('')
      expect(style.left).toBe('')
      expect(style.right).toBe('')
    })
  })

  it('falls back to document.body when appContainerRef.current is null', () => {
    const saved = mockUseApp.layoutRefs
    mockUseApp.layoutRefs = { appContainerRef: { current: null } }
    renderMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    mockUseApp.layoutRefs = saved
  })

  it('closes menu on window resize', () => {
    renderMenu()
    window.dispatchEvent(new Event('resize'))
    expect(mockSetIsOpen).toHaveBeenCalledWith(false)
  })
})
