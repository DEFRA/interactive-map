// components/Panel.test.jsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Panel } from './Panel'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'

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
      showLabel: true,
      desktop: { slot: 'side', initiallyOpen: true, dismissable: false, modal: false },
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
      renderPanel({ showLabel: false })
      expect(screen.getByText('Settings')).toHaveClass('im-u-visually-hidden')
    })

    it('applies offset class to body when showLabel=false and dismissable', () => {
      renderPanel({ showLabel: false, desktop: { slot: 'side', dismissable: true, initiallyOpen: false } })
      expect(screen.getByRole('dialog').querySelector('.im-c-panel__body')).toHaveClass('im-c-panel__body--offset')
    })

    it('applies width style if provided', () => {
      renderPanel({ desktop: { slot: 'side', dismissable: true, initiallyOpen: true, width: '300px' } })
      expect(screen.getByRole('complementary')).toHaveStyle({ width: '300px' })
    })
  })

  describe('role and aria attributes', () => {
    it('renders region role for non-dismissable panels', () => {
      renderPanel()
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('renders dialog role for dismissable non-aside panels', () => {
      renderPanel({ desktop: { slot: 'side', dismissable: true, initiallyOpen: false } })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders complementary role for dismissable aside panels', () => {
      renderPanel({ desktop: { slot: 'side', initiallyOpen: true, dismissable: true } })
      expect(screen.getByRole('complementary')).toBeInTheDocument()
    })

    it('sets aria-modal and tabIndex for modal dialogs', () => {
      renderPanel({ desktop: { slot: 'overlay', dismissable: true, modal: true } })
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('close functionality', () => {
    it('focuses triggeringElement on close for button slots', () => {
      const focusMock = jest.fn()
      const triggeringElement = { focus: focusMock, parentNode: document.createElement('div') }

      renderPanel(
        { desktop: { slot: 'top-button', dismissable: true, initiallyOpen: false } },
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
        { desktop: { slot: 'overlay', dismissable: true, modal: true } },
        { props: { triggeringElement } }
      )

      fireEvent.click(screen.getByRole('button', { name: 'Close Settings' }))
      expect(focusMock).toHaveBeenCalled()
    })

    it('falls back to viewportRef focus when no triggeringElement', () => {
      renderPanel({ desktop: { slot: 'side', dismissable: true, initiallyOpen: false } })

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
  })
})
