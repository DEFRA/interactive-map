import React from 'react'
import { render, act } from '@testing-library/react'
import { Hints } from './Hints.jsx'
import { useConfig } from '../../store/configContext.js'
import { useService } from '../../store/serviceContext.js'
import { useApp } from '../../store/appContext.js'

jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../../store/serviceContext.js', () => ({ useService: jest.fn() }))
jest.mock('../../store/appContext.js', () => ({ useApp: jest.fn() }))

const CONTAINER_ID = '#test-map-hints'
const HINT_CLASS = '.im-c-hints__hint'

let capturedSubscriber
let mockHints

const setup = ({ mainEl = document.createElement('div') } = {}) => {
  capturedSubscriber = null
  mockHints = {
    subscribe: jest.fn((fn) => {
      capturedSubscriber = fn
      return () => {}
    })
  }
  useConfig.mockReturnValue({ id: 'test-map', keyboardHintText: '<kbd>Shift</kbd> + <kbd>?</kbd>' })
  useService.mockReturnValue({ hints: mockHints })
  useApp.mockReturnValue({ layoutRefs: { mainRef: { current: mainEl } } })
  if (mainEl) document.body.appendChild(mainEl)
  return mainEl
}

afterEach(() => {
  document.body.innerHTML = ''
  jest.clearAllMocks()
})

// ─── rendering ───────────────────────────────────────────────────────────────

describe('Hints — rendering', () => {
  it('renders the container into mainRef after mount', () => {
    const mainEl = setup()
    render(<Hints />)
    expect(mainEl.querySelector(CONTAINER_ID)).toBeTruthy()
  })

  it('renders a persistent keyboard-desc span with the hint text', () => {
    const mainEl = setup()
    render(<Hints />)
    const desc = mainEl.querySelector('#test-map-keyboard-desc')
    expect(desc).toBeTruthy()
    expect(desc.innerHTML).toBe('<kbd>Shift</kbd> + <kbd>?</kbd>')
  })

  it('renders no hint content when there is no active hint', () => {
    const mainEl = setup()
    render(<Hints />)
    expect(mainEl.querySelector(HINT_CLASS)).toBeNull()
  })

  it('renders hint content when subscriber fires with a hint', () => {
    const mainEl = setup()
    render(<Hints />)
    act(() => capturedSubscriber({ html: '<kbd>Enter</kbd> to select' }))
    const hint = mainEl.querySelector(HINT_CLASS)
    expect(hint).toBeTruthy()
    expect(hint.innerHTML).toBe('<kbd>Enter</kbd> to select')
  })

  it('removes hint content when subscriber fires with null', () => {
    const mainEl = setup()
    render(<Hints />)
    act(() => capturedSubscriber({ html: 'hello' }))
    act(() => capturedSubscriber(null))
    expect(mainEl.querySelector(HINT_CLASS)).toBeNull()
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

  it('renders nothing when mainRef is null', () => {
    setup({ mainEl: null })
    useApp.mockReturnValue({ layoutRefs: { mainRef: { current: null } } })
    const { container } = render(<Hints />)
    expect(container.innerHTML).toBe('')
  })
})
