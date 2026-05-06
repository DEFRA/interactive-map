import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs } from './Tabs'

const TAB_A = { name: 'Alpha', content: <p>Alpha content</p> }
const TAB_B = { name: 'Beta', content: <p>Beta content</p> }
const TAB_C = { name: 'Gamma', content: <p>Gamma content</p> }

// ─── rendering ───────────────────────────────────────────────────────────────

describe('Tabs — rendering', () => {
  it('renders a tab button for each entry', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    expect(screen.getByRole('tab', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Beta' })).toBeInTheDocument()
  })

  it('shows content for the active tab only', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    expect(screen.getByText('Alpha content')).toBeInTheDocument()
    expect(screen.queryByText('Beta content')).not.toBeInTheDocument()
  })

  it('uses defaultTab to set the initial active tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} defaultTab='Beta' />)
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Beta content')).toBeInTheDocument()
    expect(screen.queryByText('Alpha content')).not.toBeInTheDocument()
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
    expect(screen.getByText('Beta content')).toBeInTheDocument()
    expect(screen.queryByText('Alpha content')).not.toBeInTheDocument()
  })
})

// ─── WCAG attributes ─────────────────────────────────────────────────────────

describe('Tabs — WCAG attributes', () => {
  it('active tab has tabIndex 0, inactive tabs have tabIndex -1', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabindex', '-1')
  })

  it('each tab has aria-controls pointing to an element in the DOM', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    const tab = screen.getByRole('tab', { name: 'Alpha' })
    expect(document.getElementById(tab.getAttribute('aria-controls'))).toBeInTheDocument()
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
  it('ArrowRight moves to next tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B, TAB_C]} />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Alpha' }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowLeft moves to previous tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B, TAB_C]} defaultTab='Beta' />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Beta' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowRight wraps from last tab to first', () => {
    render(<Tabs tabs={[TAB_A, TAB_B, TAB_C]} defaultTab='Gamma' />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Gamma' }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowLeft wraps from first tab to last', () => {
    render(<Tabs tabs={[TAB_A, TAB_B, TAB_C]} />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Alpha' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Home moves to first tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B, TAB_C]} defaultTab='Gamma' />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Gamma' }), { key: 'Home' })
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
  })

  it('End moves to last tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B, TAB_C]} />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Alpha' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true')
  })

  it('unhandled keys do not change the active tab', () => {
    render(<Tabs tabs={[TAB_A, TAB_B]} />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Alpha' }), { key: 'Enter' })
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
  })
})
