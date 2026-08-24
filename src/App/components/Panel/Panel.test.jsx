// components/Panel.test.jsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Panel } from './Panel'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'
import { useIsScrollable } from '../../hooks/useIsScrollable.js'

jest.mock('../../store/configContext', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/appContext', () => ({ useApp: jest.fn() }))
jest.mock('../../../utils/stringToKebab', () => ({ stringToKebab: (str) => str.toLowerCase().replace(/\s+/g, '-') }))
jest.mock('../../hooks/useModalPanelBehaviour.js', () => ({ useModalPanelBehaviour: jest.fn() }))
jest.mock('../../hooks/useIsScrollable.js', () => ({ useIsScrollable: jest.fn(() => false) }))
jest.mock('../../components/Icon/Icon', () => ({ Icon: ({ id }) => <svg data-testid={id} /> }))

describe('Panel', () => {
  const dispatch = jest.fn()
  const layoutRefs = {
    mainRef: { current: {} },
    viewportRef: { current: { focus: jest.fn() } }
  }

  beforeEach(() => {
    useConfig.mockReturnValue({ id: 'app' })
    useApp.mockReturnValue({ dispatch, breakpoint: 'desktop', layoutRefs })
    document.body.innerHTML = '<div id="app-im-app"></div>'
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb())
    jest.clearAllMocks()
  })

  afterEach(() => window.requestAnimationFrame.mockRestore())

  const renderPanel = (config = {}, props = {}) => {
    const panelConfig = {
      desktop: { slot: 'side', open: true, dismissible: false, modal: false, showLabel: true },
      ...config
    }
    return render(<Panel panelId='Settings' panelConfig={panelConfig} label='Settings' {...props} />)
  }

  describe('rendering and accessibility', () => {
    it('renders with correct id and classes', () => {
      renderPanel()
      const panel = screen.getByRole('region')
      expect(panel).toHaveAttribute('id', 'app-panel-settings')
      expect(panel).toHaveClass('im-c-panel')
      expect(screen.getByText('Settings')).toHaveClass('im-c-panel__heading', 'im-e-heading-m')
    })

    it('renders visually hidden label when showLabel=false', () => {
      renderPanel({ desktop: { slot: 'side', open: true, dismissible: false, modal: false, showLabel: false } })
      expect(screen.getByText('Settings')).toHaveClass('im-u-visually-hidden')
    })

    it('applies offset class to body when showLabel=false and dismissible', () => {
      renderPanel({ desktop: { slot: 'side', dismissible: true, open: false, showLabel: false } })
      expect(screen.getByRole('dialog').querySelector('.im-c-panel__body')).toHaveClass('im-c-panel__body--offset')
    })

    it('applies width style if provided', () => {
      renderPanel({ desktop: { slot: 'side', dismissible: true, open: true, width: '300px' } })
      expect(screen.getByRole('complementary')).toHaveStyle({ width: '300px' })
    })

    it('adds scrollable attributes to body when content overflows', () => {
      // 1. Force the mock to true ONLY for this test
      useIsScrollable.mockReturnValue(true)

      const { container } = renderPanel()

      // 2. Target by class to avoid role collision with the parent panel
      const body = container.querySelector('[data-panel-slot]')

      expect(body).toHaveAttribute('tabIndex', '0')
      expect(body).toHaveAttribute('role', 'region')
      expect(body).toHaveAttribute('aria-labelledby', 'app-panel-settings-label')

      // 3. IMPORTANT: Reset to false so other tests don't see two regions
      useIsScrollable.mockReturnValue(false)
    })
  })

  describe('role and aria attributes', () => {
    it('renders region role for non-dismissible panels', () => {
      renderPanel()
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('renders dialog role for dismissible non-aside panels', () => {
      renderPanel({ desktop: { slot: 'side', dismissible: true, open: false } })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders complementary role for dismissible aside panels', () => {
      renderPanel({ desktop: { slot: 'side', open: true, dismissible: true } })
      expect(screen.getByRole('complementary')).toBeInTheDocument()
    })

    it('sets aria-modal and tabIndex for modal dialogs', () => {
      renderPanel({ desktop: { slot: 'overlay', dismissible: true, modal: true } })
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('focus behaviour', () => {
    it('focuses panel on mount when focus: true', () => {
      const { container } = renderPanel({ focus: true })
      const panel = container.firstChild
      expect(panel).toHaveAttribute('tabIndex', '-1')
      expect(document.activeElement).toBe(panel)
    })

    it('does not focus panel on mount when focus: false and no triggering element or modal', () => {
      const { container } = renderPanel({ focus: false })
      const panel = container.firstChild
      expect(panel).not.toHaveAttribute('tabIndex')
      expect(document.activeElement).not.toBe(panel)
    })

    it('focuses panel on mount when modal even if focus: false', () => {
      const { container } = renderPanel({ focus: false, desktop: { slot: 'overlay', dismissible: true, modal: true } })
      const panel = container.firstChild
      expect(panel).toHaveAttribute('tabIndex', '-1')
      expect(document.activeElement).toBe(panel)
    })

    it('focuses panel when focusOnOpen is true regardless of panelConfig.focus', () => {
      const { container } = renderPanel({ focus: false }, { focusOnOpen: true })
      const panel = container.firstChild
      expect(panel).toHaveAttribute('tabIndex', '-1')
      expect(document.activeElement).toBe(panel)
    })

    it('does not focus panel when focusOnOpen is false even if panelConfig.focus is true', () => {
      const { container } = renderPanel({ focus: true }, { focusOnOpen: false })
      const panel = container.firstChild
      expect(panel).not.toHaveAttribute('tabIndex')
      expect(document.activeElement).not.toBe(panel)
    })
  })

  describe('close functionality', () => {
    it('focuses triggeringElement on close for button slots', () => {
      const focusMock = jest.fn()
      const triggeringElement = { focus: focusMock, parentNode: document.createElement('div') }

      renderPanel(
        { desktop: { slot: 'top-button', dismissible: true, open: false } },
        { props: { triggeringElement } }
      )

      fireEvent.click(screen.getByRole('button', { name: 'Close Settings' }))
      expect(focusMock).toHaveBeenCalled()
      expect(dispatch).toHaveBeenCalledWith({ type: 'CLOSE_PANEL', payload: 'Settings' })
    })

    it('handles close for non-button slots', () => {
      const focusMock = jest.fn()
      const triggeringElement = { focus: focusMock, parentNode: document.createElement('div') }

      renderPanel(
        { desktop: { slot: 'overlay', dismissible: true, modal: true } },
        { props: { triggeringElement } }
      )

      fireEvent.click(screen.getByRole('button', { name: 'Close Settings' }))
      expect(focusMock).toHaveBeenCalled()
    })

    it('falls back to viewportRef focus when no triggeringElement', () => {
      renderPanel({ desktop: { slot: 'side', dismissible: true, open: false } })

      fireEvent.click(screen.getByRole('button', { name: 'Close Settings' }))
      expect(layoutRefs.viewportRef.current.focus).toHaveBeenCalled()
      expect(dispatch).toHaveBeenCalledWith({ type: 'CLOSE_PANEL', payload: 'Settings' })
    })
  })

  describe('content rendering', () => {
    it('renders children when no WrappedChild provided', () => {
      renderPanel({}, { children: <p>Child content</p> })
      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('renders WrappedChild when provided', () => {
      const Wrapped = (props) => <p>Wrapped {props.extra}</p>
      renderPanel({}, { WrappedChild: Wrapped, props: { extra: 'content' } })
      expect(screen.getByText('Wrapped content')).toBeInTheDocument()
    })

    it('renders html content when html prop is provided', () => {
      renderPanel({}, { html: '<p>HTML content</p>' })
      expect(screen.getByText('HTML content')).toBeInTheDocument()
    })

    it('renders each items entry in list order', () => {
      const items = [
        { id: 'a', element: <p>First</p> },
        { id: 'b', element: <p>Second</p> }
      ]
      renderPanel({}, { items })
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })

    it('prefers items over WrappedChild/children when provided', () => {
      const Wrapped = () => <p>Wrapped</p>
      renderPanel({}, {
        items: [{ id: 'a', element: <p>Item</p> }],
        WrappedChild: Wrapped,
        children: <p>Child content</p>
      })
      expect(screen.getByText('Item')).toBeInTheDocument()
      expect(screen.queryByText('Wrapped')).not.toBeInTheDocument()
      expect(screen.queryByText('Child content')).not.toBeInTheDocument()
    })

    it('stamps data-panel-slot on the items-capable body, for controls DOM-projected via the JS API', () => {
      const { container } = renderPanel({}, { items: [{ id: 'a', element: <p>Item</p> }] })
      const body = container.querySelector('[data-panel-slot]')
      expect(body).toHaveAttribute('data-panel-slot', 'settings-panel')
    })

    it('does not stamp data-panel-slot on a static-html body', () => {
      const { container } = renderPanel({}, { html: '<p>HTML content</p>' })
      const body = container.querySelector('.im-c-panel__body')
      expect(body).not.toHaveAttribute('data-panel-slot')
    })

    describe('tabs', () => {
      const tabs = [
        { name: 'First', items: [{ id: 'a', element: <p>First content</p> }] },
        { name: 'Second', items: [{ id: 'b', element: <p>Second content</p> }] }
      ]

      it('renders items grouped into tabs when the tabs prop is provided', () => {
        renderPanel({}, { tabs })
        expect(screen.getByRole('tablist')).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'First' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Second' })).toBeInTheDocument()
        expect(screen.getByText('First content')).toBeInTheDocument()
      })

      it('switches tab content when a different tab is activated', () => {
        renderPanel({}, { tabs })
        fireEvent.click(screen.getByRole('tab', { name: 'Second' }))
        expect(screen.getByText('Second content')).toBeVisible()
        expect(screen.getByText('First content')).not.toBeVisible()
      })

      it('prefers tabs over items/WrappedChild/children when provided', () => {
        renderPanel({}, {
          tabs,
          items: [{ id: 'x', element: <p>Flat item</p> }],
          WrappedChild: () => <p>Wrapped</p>,
          children: <p>Child content</p>
        })
        expect(screen.getByText('First content')).toBeInTheDocument()
        expect(screen.queryByText('Flat item')).not.toBeInTheDocument()
        expect(screen.queryByText('Wrapped')).not.toBeInTheDocument()
        expect(screen.queryByText('Child content')).not.toBeInTheDocument()
      })

      it('keeps the panel body wrapper (padding, data-panel-slot) around the whole tabs block', () => {
        const { container } = renderPanel({}, { tabs })
        const body = container.querySelector('[data-panel-slot]')
        expect(body).toHaveAttribute('data-panel-slot', 'settings-panel')
        expect(body.querySelector('[role="tablist"]')).not.toBeNull()
        expect(body.querySelector('[role="tabpanel"]')).not.toBeNull()
      })

      it('keeps the outer wrapper as the normal, unconditional im-c-panel__body — the tablist and tabpanel pick up their inset by being nested inside it, same as any other panel content', () => {
        const { container } = renderPanel({}, { tabs })
        const body = container.querySelector('[data-panel-slot]')
        expect(body).toHaveClass('im-c-panel__body')
      })

      it('keeps the tablist outside the scrollable tabpanel, so it does not scroll away with long tab content', () => {
        const { container } = renderPanel({}, { tabs })
        const tabpanel = container.querySelector('[role="tabpanel"]')
        expect(tabpanel.querySelector('[role="tablist"]')).toBeNull()
      })

      it('places the tablist before the tabpanel in DOM order, so keyboard focus reaches it first', () => {
        const { container } = renderPanel({}, { tabs })
        const tablist = container.querySelector('[role="tablist"]')
        const tabpanel = container.querySelector('[role="tabpanel"]')
        // DOCUMENT_POSITION_FOLLOWING (4) means `tabpanel` comes after `tablist`
        // eslint-disable-next-line no-bitwise
        expect(tablist.compareDocumentPosition(tabpanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      })

      it('moves the scrollable-region treatment onto the tabpanel itself, not the outer wrapper', () => {
        useIsScrollable.mockReturnValue(true)

        const { container } = renderPanel({}, { tabs })
        const body = container.querySelector('[data-panel-slot]')
        const tabpanel = screen.getByRole('tabpanel')

        expect(tabpanel).toHaveAttribute('tabIndex', '0')
        expect(body).not.toHaveAttribute('tabIndex')
        expect(body).not.toHaveAttribute('role', 'region')
        expect(tabpanel).not.toHaveAttribute('data-panel-slot')

        useIsScrollable.mockReturnValue(false)
      })
    })
  })
})
