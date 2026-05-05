// src/components/KeyboardHelp.test.jsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { KeyboardHelp } from './KeyboardHelp'
import { getKeyboardShortcuts } from '../../registry/keyboardShortcutRegistry.js'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext.js'

jest.mock('../../registry/keyboardShortcutRegistry.js', () => ({
  getKeyboardShortcuts: jest.fn()
}))

jest.mock('../../store/configContext', () => ({
  useConfig: jest.fn()
}))

jest.mock('../../store/appContext.js', () => ({
  useApp: jest.fn()
}))

jest.mock('../../hooks/useResizeObserver.js', () => ({ useResizeObserver: jest.fn() }))

const SELECT_FEATURES_GROUP = 'Select features'
const DEFAULT_GROUP = 'Navigate'

// Ungrouped — mirrors real core shortcuts (no group, plain context)
const VIEWPORT_SHORTCUTS = [
  { id: '1', context: 'viewport', title: 'Move', command: '<kbd>↑</kbd>' },
  { id: '2', context: 'viewport', title: 'Zoom', command: '<kbd>+</kbd>' }
]

const LISTBOX_SHORTCUTS = [
  { id: '3', group: SELECT_FEATURES_GROUP, context: 'listbox', title: 'Navigate', command: '<kbd>↓</kbd>' },
  { id: '4', group: SELECT_FEATURES_GROUP, context: 'listbox', title: 'Select', command: '<kbd>Enter</kbd>' }
]

const GLOBAL_SHORTCUTS = [
  { id: '5', context: 'global', title: 'Help', command: '<kbd>Alt</kbd>' }
]

beforeEach(() => {
  useConfig.mockReturnValue({})
  useApp.mockReturnValue({ listboxIsActive: false })
})

afterEach(() => {
  jest.clearAllMocks()
})

// ─── flat list (single group) ─────────────────────────────────────────────────

describe('KeyboardHelp — flat list', () => {
  it('renders a flat list with no tabs when all shortcuts share one group', () => {
    getKeyboardShortcuts.mockReturnValue(VIEWPORT_SHORTCUTS)
    render(<KeyboardHelp />)
    expect(document.querySelector('.im-c-keyboard-help')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByText('Move')).toBeInTheDocument()
    expect(screen.getByText('Zoom')).toBeInTheDocument()
  })

  it('renders a flat list with no tabs when there are no shortcuts', () => {
    getKeyboardShortcuts.mockReturnValue([])
    render(<KeyboardHelp />)
    expect(document.querySelector('.im-c-keyboard-help')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('renders command HTML', () => {
    getKeyboardShortcuts.mockReturnValue(VIEWPORT_SHORTCUTS)
    render(<KeyboardHelp />)
    expect(screen.getByText('↑')).toBeInTheDocument()
  })
})

// ─── tab UI (multiple groups) ─────────────────────────────────────────────────

describe('KeyboardHelp — tabs', () => {
  const allShortcuts = [...GLOBAL_SHORTCUTS, ...VIEWPORT_SHORTCUTS, ...LISTBOX_SHORTCUTS]

  beforeEach(() => {
    useApp.mockReturnValue({ listboxIsActive: true })
  })

  it('renders a tab for each group when listboxIsActive is true', () => {
    getKeyboardShortcuts.mockReturnValue(allShortcuts)
    render(<KeyboardHelp />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: DEFAULT_GROUP })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: SELECT_FEATURES_GROUP })).toBeInTheDocument()
  })

  it('defaults to first viewport-context tab when context is viewport', () => {
    getKeyboardShortcuts.mockReturnValue(allShortcuts)
    render(<KeyboardHelp context='viewport' />)
    expect(screen.getByRole('tab', { name: DEFAULT_GROUP })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Move')).toBeInTheDocument()
  })

  it('defaults to first listbox-context tab when context is listbox', () => {
    getKeyboardShortcuts.mockReturnValue(allShortcuts)
    render(<KeyboardHelp context='listbox' />)
    expect(screen.getByRole('tab', { name: SELECT_FEATURES_GROUP })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Select')).toBeInTheDocument()
  })

  it('falls back to first global-context tab when no exact match exists', () => {
    getKeyboardShortcuts.mockReturnValue([...GLOBAL_SHORTCUTS, ...LISTBOX_SHORTCUTS])
    render(<KeyboardHelp context='viewport' />)
    expect(screen.getByRole('tab', { name: DEFAULT_GROUP })).toHaveAttribute('aria-selected', 'true')
  })

  it('falls back to first tab when no exact or global-context match exists', () => {
    getKeyboardShortcuts.mockReturnValue([
      { id: 'a', group: 'Group A', context: 'listbox', title: 'A', command: '<kbd>A</kbd>' },
      { id: 'b', group: 'Group B', context: 'listbox', title: 'B', command: '<kbd>B</kbd>' }
    ])
    render(<KeyboardHelp context='viewport' />)
    expect(screen.getByRole('tab', { name: 'Group A' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows only the active tab panel content', () => {
    getKeyboardShortcuts.mockReturnValue(allShortcuts)
    render(<KeyboardHelp context='viewport' />)
    expect(screen.getByText('Move')).toBeInTheDocument()
    expect(screen.queryByText('Select')).not.toBeInTheDocument()
  })

  it('switches tab and content on click', () => {
    getKeyboardShortcuts.mockReturnValue(allShortcuts)
    render(<KeyboardHelp context='viewport' />)
    fireEvent.click(screen.getByRole('tab', { name: SELECT_FEATURES_GROUP }))
    expect(screen.getByRole('tab', { name: SELECT_FEATURES_GROUP })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Select')).toBeInTheDocument()
    expect(screen.queryByText('Move')).not.toBeInTheDocument()
  })

  it('ungrouped shortcuts default to Navigate group', () => {
    getKeyboardShortcuts.mockReturnValue([
      { id: 'x', title: 'No group', command: '<kbd>X</kbd>' },
      ...LISTBOX_SHORTCUTS
    ])
    render(<KeyboardHelp />)
    fireEvent.click(screen.getByRole('tab', { name: DEFAULT_GROUP }))
    expect(screen.getByText('No group')).toBeInTheDocument()
  })
})

// ─── listboxIsActive filtering ────────────────────────────────────────────────

describe('KeyboardHelp — listboxIsActive filtering', () => {
  const allShortcuts = [...GLOBAL_SHORTCUTS, ...VIEWPORT_SHORTCUTS, ...LISTBOX_SHORTCUTS]

  it('hides the Select features tab when listboxIsActive is false', () => {
    getKeyboardShortcuts.mockReturnValue(allShortcuts)
    render(<KeyboardHelp />)
    expect(screen.queryByRole('tab', { name: SELECT_FEATURES_GROUP })).not.toBeInTheDocument()
  })

  it('still shows ungrouped shortcuts when listboxIsActive is false', () => {
    getKeyboardShortcuts.mockReturnValue(allShortcuts)
    render(<KeyboardHelp />)
    expect(screen.getByText('Move')).toBeInTheDocument()
  })

  it('renders as a flat list when only ungrouped shortcuts remain after filtering', () => {
    getKeyboardShortcuts.mockReturnValue([...VIEWPORT_SHORTCUTS, ...LISTBOX_SHORTCUTS])
    render(<KeyboardHelp />)
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByText('Move')).toBeInTheDocument()
  })
})
