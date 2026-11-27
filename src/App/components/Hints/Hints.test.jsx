import React from 'react'
import { render, act } from '@testing-library/react'
import { Hints } from './Hints.jsx'
import { useConfig } from '../../store/configContext.js'
import { useService } from '../../store/serviceContext.js'

jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/serviceContext.js', () => ({ useService: jest.fn() }))

const CONTAINER_ID = '#test-map-hints'
const HINT_CLASS = '.im-c-hints__hint'

let capturedSubscriber
let mockHints

const setup = () => {
  capturedSubscriber = null
  mockHints = {
    subscribe: jest.fn((fn) => {
      capturedSubscriber = fn
      return () => {}
    })
  }
  useConfig.mockReturnValue({ id: 'test-map', keyboardHintText: '<kbd>Shift</kbd> + <kbd>?</kbd>' })
  useService.mockReturnValue({ hints: mockHints })
}

afterEach(() => {
  jest.clearAllMocks()
})

// ─── rendering ───────────────────────────────────────────────────────────────

describe('Hints — rendering', () => {
  it('renders the container in place', () => {
    setup()
    const { container } = render(<Hints />)
    expect(container.querySelector(CONTAINER_ID)).toBeTruthy()
  })

  it('renders a persistent keyboard-desc span with the hint text', () => {
    setup()
    const { container } = render(<Hints />)
    const desc = container.querySelector('#test-map-keyboard-desc')
    expect(desc).toBeTruthy()
    expect(desc.innerHTML).toBe('Shift + ?')
  })

  it('appends the map-controls hint text when enableMapControls is true', () => {
    setup()
    useConfig.mockReturnValue({
      id: 'test-map',
      keyboardHintText: '<kbd>Shift</kbd> + <kbd>?</kbd>',
      enableMapControls: true,
      mapControlsHintText: '<kbd>Arrow keys</kbd> to move'
    })
    const { container } = render(<Hints />)
    const desc = container.querySelector('#test-map-keyboard-desc')
    expect(desc.innerHTML).toBe('Shift + ? Arrow keys to move')
  })

  it('renders no hint content when there is no active hint', () => {
    setup()
    const { container } = render(<Hints />)
    expect(container.querySelector(HINT_CLASS)).toBeNull()
  })

  it('renders hint content when subscriber fires with a hint', () => {
    setup()
    const { container } = render(<Hints />)
    act(() => capturedSubscriber({ html: '<kbd>Enter</kbd> to select' }))
    const hint = container.querySelector(HINT_CLASS)
    expect(hint).toBeTruthy()
    expect(hint.innerHTML).toBe('<kbd>Enter</kbd> to select')
  })

  it('removes hint content when subscriber fires with null', () => {
    setup()
    const { container } = render(<Hints />)
    act(() => capturedSubscriber({ html: 'hello' }))
    act(() => capturedSubscriber(null))
    expect(container.querySelector(HINT_CLASS)).toBeNull()
  })
})

// ─── lifecycle ───────────────────────────────────────────────────────────────

describe('Hints — lifecycle', () => {
  it('subscribes to hints on mount', () => {
    setup()
    render(<Hints />)
    expect(mockHints.subscribe).toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    const unsub = jest.fn()
    setup()
    mockHints = { subscribe: jest.fn(() => unsub) }
    useService.mockReturnValue({ hints: mockHints })
    const { unmount } = render(<Hints />)
    unmount()
    expect(unsub).toHaveBeenCalled()
  })
})
