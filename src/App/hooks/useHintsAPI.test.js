import { renderHook, act } from '@testing-library/react'
import { useHintsAPI } from './useHintsAPI.js'
import { useService } from '../store/serviceContext.js'

jest.mock('../store/serviceContext.js')

const makeEventBus = () => {
  const handlers = {}
  return {
    on: jest.fn((event, handler) => { handlers[event] = handler }),
    off: jest.fn(),
    emit: (event, payload) => handlers[event]?.(payload),
    _handlers: handlers
  }
}

describe('useHintsAPI', () => {
  let mockEventBus, mockHints

  beforeEach(() => {
    mockEventBus = makeEventBus()
    mockHints = { show: jest.fn(), dismiss: jest.fn() }
    useService.mockReturnValue({ eventBus: mockEventBus, hints: mockHints })
  })

  it('calls hints.show with text and options on app:showhint', () => {
    renderHook(() => useHintsAPI())
    act(() => mockEventBus.emit('app:showhint', { text: 'Press Enter to select', options: { duration: 2000 } }))
    expect(mockHints.show).toHaveBeenCalledWith('Press Enter to select', { duration: 2000 })
  })

  it('ignores app:showhint with no text', () => {
    renderHook(() => useHintsAPI())
    act(() => mockEventBus.emit('app:showhint', {}))
    act(() => mockEventBus.emit('app:showhint'))
    expect(mockHints.show).not.toHaveBeenCalled()
  })

  it('calls hints.dismiss on app:dismisshint', () => {
    renderHook(() => useHintsAPI())
    act(() => mockEventBus.emit('app:dismisshint'))
    expect(mockHints.dismiss).toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useHintsAPI())
    unmount()
    expect(mockEventBus.off).toHaveBeenCalledWith('app:showhint', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:dismisshint', expect.any(Function))
  })
})
