// src/components/KeyboardHelp.test.jsx
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { KeyboardHelp } from './KeyboardHelp'
import { getKeyboardShortcuts } from '../../registry/keyboardShortcutRegistry.js'
import { useConfig } from '../../store/configContext'

jest.mock('../../registry/keyboardShortcutRegistry.js', () => ({
  getKeyboardShortcuts: jest.fn()
}))

jest.mock('../../store/configContext', () => ({
  useConfig: jest.fn()
}))

describe('KeyboardHelp', () => {
  beforeEach(() => {
    useConfig.mockReturnValue({})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders grouped keyboard shortcuts correctly', () => {
    getKeyboardShortcuts.mockReturnValue([
      { id: '1', group: 'Navigation', title: 'Go Home', command: '<kbd>H</kbd>' },
      { id: '2', group: 'Navigation', title: 'Search', command: '<kbd>/</kbd>' },
      { id: '3', group: 'Editing', title: 'Copy', command: '<kbd>Ctrl+C</kbd>' }
    ])

    render(<KeyboardHelp />)

    // outer container
    const container = document.querySelector('.im-c-keyboard-help')
    expect(container).toBeInTheDocument()

    // Navigation group contains its shortcuts
    const navGroup = screen.getByText('Go Home').closest('.im-c-keyboard-help__group')
    expect(navGroup).toBeInTheDocument()
    expect(within(navGroup).getByText('Search')).toBeInTheDocument()
    expect(within(navGroup).getByText('Go Home')).toBeInTheDocument()

    // Editing group contains its shortcut
    const editGroup = screen.getByText('Copy').closest('.im-c-keyboard-help__group')
    expect(editGroup).toBeInTheDocument()

    // command HTML is injected
    expect(screen.getByText('H')).toBeInTheDocument()
    expect(screen.getByText('/')).toBeInTheDocument()
    expect(screen.getByText('Ctrl+C')).toBeInTheDocument()
  })

  it('renders nothing if there are no shortcuts', () => {
    getKeyboardShortcuts.mockReturnValue([])

    render(<KeyboardHelp />)

    const container = document.querySelector('.im-c-keyboard-help')
    expect(container).toBeInTheDocument()
    expect(container.querySelectorAll('.im-c-keyboard-help__group')).toHaveLength(0)
  })
})
