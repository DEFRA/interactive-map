import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs } from './Tabs'
import { useConfig } from '../../store/configContext'

jest.mock('../../store/configContext', () => ({ useConfig: jest.fn() }))

const TAB_A = { name: 'Alpha', content: <p>Alpha content</p> }
const TAB_B = { name: 'Beta', content: <p>Beta content</p> }
const TAB_C = { name: 'Gamma', content: <p>Gamma content</p> }

beforeEach(() => {
  useConfig.mockReturnValue({ id: 'test-app' })
})

// ─── rendering ───────────────────────────────────────────────────────────────

describe('Tabs — rendering', () => {
  it('renders a tab button for each entry', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    expect(screen.getByRole('tab', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Beta' })).toBeInTheDocument()
  })

  it('shows content for the active tab only — the inactive one stays in the DOM (so its aria-controls target exists) but hidden', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    expect(screen.getByText('Alpha content')).toBeVisible()
    expect(screen.getByText('Beta content')).not.toBeVisible()
  })

  it('uses defaultTab to set the initial active tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} defaultTab='Beta' />)
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Beta content')).toBeVisible()
    expect(screen.getByText('Alpha content')).not.toBeVisible()
  })

  it('falls back to first tab when defaultTab is not provided', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
  })
})

// ─── click behaviour ──────────────────────────────────────────────────────────

describe('Tabs — click behaviour', () => {
  it('switches to the clicked tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }))
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Beta content')).toBeVisible()
    expect(screen.getByText('Alpha content')).not.toBeVisible()
  })
})

// ─── WCAG attributes ─────────────────────────────────────────────────────────

describe('Tabs — WCAG attributes', () => {
  it('active tab has tabIndex 0, inactive tabs have tabIndex -1', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabindex', '-1')
  })

  it('every tab has aria-controls pointing to a real element — including inactive tabs, since their panel stays in the DOM (hidden) rather than being unmounted', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    const activeTab = screen.getByRole('tab', { name: 'Alpha' })
    const inactiveTab = screen.getByRole('tab', { name: 'Beta' })
    expect(document.getElementById(activeTab.getAttribute('aria-controls'))).toBeInTheDocument()
    expect(document.getElementById(inactiveTab.getAttribute('aria-controls'))).toBeInTheDocument()
  })

  it('gives every tabpanel its own stable id, distinct per tab, not just the active one', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    const activeTab = screen.getByRole('tab', { name: 'Alpha' })
    const inactiveTab = screen.getByRole('tab', { name: 'Beta' })
    expect(activeTab.getAttribute('aria-controls')).not.toBe(inactiveTab.getAttribute('aria-controls'))
  })

  it('hides the inactive tabpanel via the hidden attribute rather than unmounting it', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    const inactiveTab = screen.getByRole('tab', { name: 'Beta' })
    const inactivePanel = document.getElementById(inactiveTab.getAttribute('aria-controls'))
    expect(inactivePanel).toHaveAttribute('hidden')
  })

  it("labels every tabpanel with its own tab, not just the active one's", () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    const inactiveTab = screen.getByRole('tab', { name: 'Beta' })
    const inactivePanel = document.getElementById(inactiveTab.getAttribute('aria-controls'))
    expect(inactivePanel.getAttribute('aria-labelledby')).toBe(inactiveTab.id)
  })

  it('panel has aria-labelledby pointing to the active tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    const panel = screen.getByRole('tabpanel')
    const tabId = panel.getAttribute('aria-labelledby')
    expect(document.getElementById(tabId)).toHaveAttribute('aria-selected', 'true')
  })

  it('panel has tabIndex -1 per ARIA tabs pattern', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '-1')
  })
})

// ─── WCAG keyboard navigation ─────────────────────────────────────────────────

describe('Tabs — WCAG keyboard navigation', () => {
  it.each([
    ['ArrowRight moves to next tab', undefined, 'Alpha', 'ArrowRight', 'Beta'],
    ['ArrowLeft moves to previous tab', 'Beta', 'Beta', 'ArrowLeft', 'Alpha'],
    ['ArrowRight wraps from last tab to first', 'Gamma', 'Gamma', 'ArrowRight', 'Alpha'],
    ['ArrowLeft wraps from first tab to last', undefined, 'Alpha', 'ArrowLeft', 'Gamma'],
    ['Home moves to first tab', 'Gamma', 'Gamma', 'Home', 'Alpha'],
    ['End moves to last tab', undefined, 'Alpha', 'End', 'Gamma']
  ])('%s', (_description, defaultTab, focusedTab, key, expectedTab) => {
    render(<Tabs tabs={[TAB_A, TAB_B, TAB_C]} defaultTab={defaultTab} />)
    fireEvent.keyDown(screen.getByRole('tab', { name: focusedTab }), { key })
    expect(screen.getByRole('tab', { name: expectedTab })).toHaveAttribute('aria-selected', 'true')
  })

  it('unhandled keys do not change the active tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Alpha' }), { key: 'Enter' })
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
  })
})
