import React from 'react'
import { render, act } from '@testing-library/react'
import { KeyboardHints } from './KeyboardHints.jsx'
import { useConfig } from '../../store/configContext.js'
import { useService } from '../../store/serviceContext.js'
import { useApp } from '../../store/appContext.js'

jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/serviceContext.js', () => ({ useService: jest.fn() }))
jest.mock('../../store/appContext.js', () => ({ useApp: jest.fn() }))

const CONTAINER_ID = '#test-map-hints'
const HINT_CLASS = '.im-c-keyboard-hints__hint'

let capturedSubscriber
let mockHintManager

const setup = ({ mainEl = document.createElement('div') } = {}) => {
  capturedSubscriber = null
  mockHintManager = {
    subscribe: jest.fn((fn) => {
      capturedSubscriber = fn
      return () => {}
    })
  }
  useConfig.mockReturnValue({ id: 'test-map' })
  useService.mockReturnValue({ hintManager: mockHintManager })
  useApp.mockReturnValue({ layoutRefs: { mainRef: { current: mainEl } } })
  if (mainEl) document.body.appendChild(mainEl)
  return mainEl
}

afterEach(() => {
  document.body.innerHTML = ''
  jest.clearAllMocks()
})

// ─── rendering ───────────────────────────────────────────────────────────────

describe('KeyboardHints — rendering', () => {
  it('renders the container into mainRef after mount', () => {
    const mainEl = setup()
    render(<KeyboardHints />)
    expect(mainEl.querySelector(CONTAINER_ID)).toBeTruthy()
  })

  it('renders no hint content when there is no active hint', () => {
    const mainEl = setup()
    render(<KeyboardHints />)
    expect(mainEl.querySelector(HINT_CLASS)).toBeNull()
  })

  it('renders hint content when subscriber fires with a hint', () => {
    const mainEl = setup()
    render(<KeyboardHints />)
    act(() => capturedSubscriber({ html: '<kbd>Enter</kbd> to select' }))
    const hint = mainEl.querySelector(HINT_CLASS)
    expect(hint).toBeTruthy()
    expect(hint.innerHTML).toBe('<kbd>Enter</kbd> to select')
  })

  it('removes hint content when subscriber fires with null', () => {
    const mainEl = setup()
    render(<KeyboardHints />)
    act(() => capturedSubscriber({ html: 'hello' }))
    act(() => capturedSubscriber(null))
    expect(mainEl.querySelector(HINT_CLASS)).toBeNull()
  })
})

// ─── lifecycle ───────────────────────────────────────────────────────────────

describe('KeyboardHints — lifecycle', () => {
  it('subscribes to hintManager on mount', () => {
    setup()
    render(<KeyboardHints />)
    expect(mockHintManager.subscribe).toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    const unsub = jest.fn()
    setup()
    mockHintManager = { subscribe: jest.fn(() => unsub) }
    useService.mockReturnValue({ hintManager: mockHintManager })
    const { unmount } = render(<KeyboardHints />)
    unmount()
    expect(unsub).toHaveBeenCalled()
  })

  it('renders nothing when mainRef is null', () => {
    setup({ mainEl: null })
    useApp.mockReturnValue({ layoutRefs: { mainRef: { current: null } } })
    const { container } = render(<KeyboardHints />)
    expect(container.innerHTML).toBe('')
  })
})
